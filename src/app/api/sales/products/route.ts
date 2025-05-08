import { NextResponse } from 'next/server';
import { createPool } from '@/lib/db';

// GET endpoint to fetch all products, categories, and subcategories
export async function GET() {
  try {
    const pool = createPool();
    
    // Fetch all products
    const [productRows] = await pool.query(
      'SELECT * FROM products ORDER BY category, subcategory, name'
    ) as [any[], any];
    
    // Extract unique categories and subcategories
    const categories: string[] = [];
    const subcategories: Record<string, string[]> = {};
    const products: Record<string, Record<string, any[]>> = {};
    
    // Process products into organized structure with string cleaning
    productRows.forEach(product => {
      // Normalize strings by trimming whitespace
      const category = (product.category || '').trim();
      const subcategory = (product.subcategory || '').trim();
      
      if (!category) return; // Skip products with empty categories
      
      // Add category if not exists
      if (!categories.includes(category)) {
        categories.push(category);
      }
      
      // Add subcategory if not exists
      if (!subcategories[category]) {
        subcategories[category] = [];
      }
      if (!subcategories[category].includes(subcategory)) {
        subcategories[category].push(subcategory);
      }
      
      // Add product to proper category and subcategory
      if (!products[category]) {
        products[category] = {};
      }
      
      if (!products[category][subcategory]) {
        products[category][subcategory] = [];
      }
      
      // Add the product with consistent ID format
      products[category][subcategory].push({
        id: String(product.id), // Ensure ID is always a string
        name: product.name || '',
        description: product.description || '',
        price: parseFloat(product.price || 0),
        unit: product.unit || 'unit'
      });
    });
    
    // Log the structure (helpful for debugging)
    console.log(`Found ${categories.length} categories, ${Object.keys(subcategories).reduce((sum, cat) => sum + subcategories[cat].length, 0)} subcategories, and ${productRows.length} products`);
    
    return NextResponse.json({
      categories,
      subcategories,
      products
    });
    
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST endpoint to create a new product
export async function POST(request: Request) {
  try {
    const pool = createPool();
    const body = await request.json();
    
    const {
      name,
      description,
      category,
      subcategory,
      price,
      discount,
      unit
    } = body;
    
    // Validate required fields
    if (!name || !category || !subcategory || price === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    // Insert new product
    const [result] = await pool.query(
      `INSERT INTO products (
        name, description, category, subcategory, price, discount, unit, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description || '',
        category,
        subcategory,
        price,
        discount || 0,
        unit || 'unit',
        now,
        now
      ]
    ) as [{ insertId: number }, any];
    
    // Fetch the created product
    const [productRows] = await pool.query(
      'SELECT * FROM products WHERE id = ?',
      [result.insertId]
    ) as [any[], any];
    
    if (productRows.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create product' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ product: productRows[0] });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update an existing product
export async function PUT(request: Request) {
  try {
    const pool = createPool();
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing product ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    const {
      name,
      description,
      category,
      subcategory,
      price,
      discount,
      unit
    } = body;
    
    // Validate required fields
    if (!name || !category || !subcategory || price === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    // Update product
    await pool.query(
      `UPDATE products SET 
        name = ?,
        description = ?,
        category = ?,
        subcategory = ?,
        price = ?,
        discount = ?,
        unit = ?,
        updated_at = ?
       WHERE id = ?`,
      [
        name,
        description || '',
        category,
        subcategory,
        price,
        discount || 0,
        unit || 'unit',
        now,
        id
      ]
    );
    
    // Fetch the updated product
    const [productRows] = await pool.query(
      'SELECT * FROM products WHERE id = ?',
      [id]
    ) as [any[], any];
    
    if (productRows.length === 0) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ product: productRows[0] });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove a product
export async function DELETE(request: Request) {
  try {
    const pool = createPool();
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing product ID' },
        { status: 400 }
      );
    }
    
    // Delete product
    await pool.query('DELETE FROM products WHERE id = ?', [id]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}