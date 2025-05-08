import { NextRequest, NextResponse } from 'next/server';
import { createPool } from '@/lib/db';

// Define interfaces for better type checking
interface QuotationRow {
  id: number;
  task_id: number;
  quotation_number: string;
  quote_ref: string;
  customer_name: string;
  customer_contact: string;
  customer_address: string;
  sales_representative: string;
  sales_uid: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: string;
  [key: string]: any;
}

interface TaskRow {
  id: number;
  name: string;
  phone1: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  sales_name: string;
  sales_uid: string;
  property: string;
  guard: string;
  [key: string]: any;
}

interface ProductRow {
  id: number;
  name: string;
  description: string;
  price: number;
  unit: string;
  category_name: string;
  subcategory_name: string;
  [key: string]: any;
}

/**
 * Fetches an existing quotation by task ID
 */
async function getExistingQuotation(query: Function, taskId: string | null) {
  if (!taskId) return null;
  
  const quotations = await query(`
    SELECT * FROM quotations
    WHERE task_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `, [taskId]);
  
  if (quotations.length === 0) return null;
  
  const quotation = quotations[0] as QuotationRow;
  const items = await query(`
    SELECT * FROM quotation_items
    WHERE quotation_id = ?
    ORDER BY id ASC
  `, [quotation.id]);
  
  return {
    quotation,
    items
  };
}

/**
 * Creates a new quotation for the given task
 */
async function createNewQuotation(query: Function, taskId: string | null) {
  if (!taskId) {
    throw new Error('Task ID is required');
  }
  
  // Fetch task data
  const taskResult = await query(`
    SELECT * FROM tasks
    WHERE id = ?
  `, [taskId]);

  if (taskResult.length === 0) {
    throw new Error('Task not found');
  }

  const task = taskResult[0] as TaskRow;

  // Generate quotation number
  const uid = task.sales_uid || '';
  const prefix = uid ? uid.substring(0, 2).toUpperCase() : 'QT';
  const currentYear = new Date().getFullYear().toString().slice(-2);
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const quote_ref = `${prefix}${currentYear}${currentMonth}`;

  // Get the count of existing quotations with this prefix
  const countResult = await query(`
    SELECT COUNT(*) as count FROM quotations
    WHERE quote_ref = ?
  `, [quote_ref]);

  const count = countResult[0].count || 0;
  const runningNumber = (count + 1).toString().padStart(4, '0');
  const quotation_number = `${quote_ref}-${runningNumber}`;

  // Calculate valid until date (14 days from now)
  const today = new Date();
  const validUntil = new Date();
  validUntil.setDate(today.getDate() + 14);

  // Create a draft quotation record
  const quotationResult = await query(`
    INSERT INTO quotations (
      task_id, 
      customer_name, 
      customer_contact, 
      customer_address, 
      quotation_date, 
      valid_until, 
      sales_representative, 
      sales_uid, 
      subtotal, 
      discount, 
      tax, 
      total, 
      notes, 
      terms, 
      status, 
      quote_ref, 
      quotation_number
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    taskId,
    task.name || '',
    task.phone1 || '',
    [task.address_line1, task.address_line2, task.city, task.state].filter(Boolean).join(', '),
    today.toISOString().split('T')[0],
    validUntil.toISOString().split('T')[0],
    task.sales_name || '',
    task.sales_uid || '',
    0, // subtotal
    0, // discount
    0, // tax
    0, // total
    '', // notes
    '1. This quotation is valid for 14 days from the date of issue.\n2. 50% deposit required to confirm order.\n3. Balance payment due upon completion.', // default terms
    'draft', // status
    quote_ref,
    quotation_number
  ]);

  const insertId = quotationResult.insertId;

  // Get the newly created quotation
  const newQuotation = await query(`
    SELECT * FROM quotations
    WHERE id = ?
  `, [insertId]);

  // Get recommended products
  const recommendedProducts = await getRecommendedProducts(query, task);
  
  // Add recommended items and update totals
  if (recommendedProducts.length > 0) {
    await addProductsToQuotation(query, insertId, recommendedProducts);
    
    // Get the updated quotation with items
    const updatedQuotation = await query(`
      SELECT * FROM quotations
      WHERE id = ?
    `, [insertId]);
    
    const items = await query(`
      SELECT * FROM quotation_items
      WHERE quotation_id = ?
      ORDER BY id ASC
    `, [insertId]);

    return {
      quotation: updatedQuotation[0],
      items,
      message: 'New quotation auto-generated with recommended products'
    };
  }

  return {
    quotation: newQuotation[0],
    items: [],
    message: 'New empty quotation auto-generated'
  };
}

/**
 * Gets recommended products based on task properties
 */
async function getRecommendedProducts(query: Function, task: TaskRow): Promise<ProductRow[]> {
  if (!task.property) return [];
  
  try {
    const propertyType = task.property;
    const recommendedCategory = propertyType === 'Landed' ? 'Shutters' : 'Blinds';
    
    return await query(`
      SELECT p.*, c.name as category_name, s.name as subcategory_name 
      FROM products p
      JOIN subcategories s ON p.subcategory_id = s.id
      JOIN categories c ON s.category_id = c.id
      WHERE c.name = ? OR p.tags LIKE ?
      LIMIT 3
    `, [
      recommendedCategory,
      `%${propertyType}%`
    ]) as ProductRow[];
  } catch (error) {
    console.error('Error getting recommended products:', error);
    return [];
  }
}

/**
 * Adds products to a quotation and updates totals
 */
async function addProductsToQuotation(query: Function, quotationId: number, products: ProductRow[]) {
  if (products.length === 0) return;
  
  try {
    // Prepare items for bulk insert
    const itemValues = products.map(product => [
      quotationId,
      product.category_name,
      product.subcategory_name,
      product.id,
      product.name || product.description,
      1, // quantity
      product.unit || 'unit',
      product.price || 0,
      product.price || 0, // total
      '' // note
    ]);

    // Insert all items
    await query(`
      INSERT INTO quotation_items (
        quotation_id, 
        category, 
        subcategory, 
        product_id, 
        description, 
        quantity, 
        unit, 
        unit_price, 
        total, 
        note
      ) VALUES ?
    `, [itemValues]);

    // Calculate and update the totals
    const subtotal = products.reduce((sum, product) => sum + (product.price || 0), 0);
    
    await query(`
      UPDATE quotations 
      SET subtotal = ?, total = ?
      WHERE id = ?
    `, [subtotal, subtotal, quotationId]);
  } catch (error) {
    console.error('Error adding products to quotation:', error);
  }
}

/**
 * GET handler for auto-quotation
 */
export async function GET(request: NextRequest) {
  const db = createPool();
  const query = db.query.bind(db);
  
  try {
    // Get taskId from query parameters
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Check if a quotation already exists for this task
    const existingResult = await getExistingQuotation(query, taskId);
    
    if (existingResult) {
      return NextResponse.json({
        quotation: existingResult.quotation,
        items: existingResult.items,
        message: 'Existing quotation found'
      });
    }

    // Create a new quotation
    const newResult = await createNewQuotation(query, taskId);
    
    return NextResponse.json(newResult);
  } catch (error: any) {
    console.error('Error in auto quotation generation:', error);
    
    // Return appropriate error responses
    if (error.message === 'Task not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Failed to generate quotation' }, { status: 500 });
  } finally {
    await db.end();
  }
}

/**
 * POST handler for auto-quotation - supports force creating a new one
 */
export async function POST(request: NextRequest) {
  const db = createPool();
  const query = db.query.bind(db);
  
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }
    
    // Extract additional parameters from the request body
    const body = await request.json();
    const forceNew = body.forceNew || false;

    // Check for existing quotation unless forceNew is true
    if (!forceNew) {
      const existingResult = await getExistingQuotation(query, taskId);
      
      if (existingResult) {
        return NextResponse.json({
          quotation: existingResult.quotation,
          items: existingResult.items,
          message: 'Existing quotation found'
        });
      }
    }

    // Create a new quotation
    const newResult = await createNewQuotation(query, taskId);
    
    return NextResponse.json({
      ...newResult,
      message: forceNew ? 'New quotation created (forced)' : newResult.message
    });
  } catch (error: any) {
    console.error('Error in auto quotation generation (POST):', error);
    
    // Return appropriate error responses
    if (error.message === 'Task not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Failed to generate quotation' }, { status: 500 });
  } finally {
    await db.end();
  }
}