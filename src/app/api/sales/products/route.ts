import { NextResponse } from "next/server";
import { createPool } from "@/lib/db";

// GET endpoint to fetch all products, categories, and subcategories
export async function GET() {
  try {
    const pool = createPool();

    // Fetch all products with the new fields
    const [productRows] = (await pool.query(
      'SELECT id, name, description, category, subcategory, price, discount, unit, effective_start_date, effective_end_date, task_id, uid, created_at, updated_at, status FROM products WHERE status = "Active" ORDER BY category, subcategory, name',
    )) as [any[], any];

    // Extract unique categories and subcategories
    const categories: string[] = [];
    const subcategories: Record<string, string[]> = {};

    // Process products and format dates correctly
    const formattedProducts = productRows.map((product) => {
      // Normalize strings by trimming whitespace
      const category = (product.category || "").trim();
      const subcategory = (product.subcategory || "").trim();

      if (category && !categories.includes(category)) {
        categories.push(category);
      }

      // Add subcategory if not exists
      if (category) {
        if (!subcategories[category]) {
          subcategories[category] = [];
        }
        if (subcategory && !subcategories[category].includes(subcategory)) {
          subcategories[category].push(subcategory);
        }
      }

      // Format the product with proper date handling
      return {
        id: product.id,
        name: product.name || "",
        description: product.description || "",
        category: category,
        subcategory: subcategory,
        price: parseFloat(product.price || 0),
        discount: parseFloat(product.discount || 0),
        unit: product.unit || "unit",
        effective_start_date: product.effective_start_date
          ? new Date(product.effective_start_date).toISOString()
          : null,
        effective_end_date: product.effective_end_date
          ? new Date(product.effective_end_date).toISOString()
          : null,
        task_id: product.task_id || "",
        uid: product.uid || "",
        created_at: product.created_at,
        updated_at: product.updated_at,
        status: product.status,
      };
    });

    console.log(
      `Found ${categories.length} categories, ${Object.keys(subcategories).reduce((sum, cat) => sum + subcategories[cat].length, 0)} subcategories, and ${productRows.length} products`,
    );

    return NextResponse.json({
      allProducts: formattedProducts,
      categories: categories,
      subcategories: subcategories,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 },
    );
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
      unit,
      effective_start_date,
      effective_end_date,
      task_id,
      uid
    } = body;

    // Validate required fields
    if (!name || !category || !subcategory || price === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    // Format dates for MySQL
    const startDate = effective_start_date
      ? new Date(effective_start_date)
          .toISOString()
          .slice(0, 19)
          .replace("T", " ")
      : null;
    const endDate = effective_end_date
      ? new Date(effective_end_date)
          .toISOString()
          .slice(0, 19)
          .replace("T", " ")
      : null;

    // Insert new product with the new fields
    const [result] = (await pool.query(
      `INSERT INTO products (
        name, description, category, subcategory, price, discount, unit, 
        effective_start_date, effective_end_date, task_id, uid, created_at, updated_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description || "",
        category,
        subcategory,
        price,
        discount || 0,
        unit || "unit",
        startDate,
        endDate,
        task_id || "",
        uid || "",
        now,
        now,
        "Active",
      ],
    )) as [{ insertId: number }, any];

    // Fetch the created product
    const [productRows] = (await pool.query(
      "SELECT * FROM products WHERE id = ?",
      [result.insertId],
    )) as [any[], any];

    if (productRows.length === 0) {
      return NextResponse.json(
        { error: "Failed to create product" },
        { status: 500 },
      );
    }

    // Format dates for response
    const product = productRows[0];
    product.effective_start_date = product.effective_start_date
      ? new Date(product.effective_start_date).toISOString()
      : null;
    product.effective_end_date = product.effective_end_date
      ? new Date(product.effective_end_date).toISOString()
      : null;

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 },
    );
  }
}

// PUT endpoint to update an existing product
export async function PUT(request: Request) {
  try {
    const pool = createPool();
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing product ID" },
        { status: 400 },
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
      unit,
      effective_start_date,
      effective_end_date,
      task_id,
      uid,
    } = body;

    // Validate required fields
    if (!name || !category || !subcategory || price === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    // Format dates for MySQL
    const startDate = effective_start_date
      ? new Date(effective_start_date)
          .toISOString()
          .slice(0, 19)
          .replace("T", " ")
      : null;
    const endDate = effective_end_date
      ? new Date(effective_end_date)
          .toISOString()
          .slice(0, 19)
          .replace("T", " ")
      : null;

    // Update product with the new fields
    await pool.query(
      `UPDATE products SET 
        name = ?,
        description = ?,
        category = ?,
        subcategory = ?,
        price = ?,
        discount = ?,
        unit = ?,
        effective_start_date = ?,
        effective_end_date = ?,
        task_id = ?,
        uid = ?,
        updated_at = ?,
        status = ?
       WHERE id = ?`,
      [
        name,
        description || "",
        category,
        subcategory,
        price,
        discount || 0,
        unit || "unit",
        startDate,
        endDate,
        task_id || "",
        uid || "",
        now,
        body.status || "Active",
        id,
      ],
    );

    // Fetch the updated product
    const [productRows] = (await pool.query(
      "SELECT * FROM products WHERE id = ?",
      [id],
    )) as [any[], any];

    if (productRows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Format dates for response
    const product = productRows[0];
    product.effective_start_date = product.effective_start_date
      ? new Date(product.effective_start_date).toISOString()
      : null;
    product.effective_end_date = product.effective_end_date
      ? new Date(product.effective_end_date).toISOString()
      : null;

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 },
    );
  }
}

// DELETE endpoint - soft delete a product (change status to Inactive)
export async function DELETE(request: Request) {
  try {
    const pool = createPool();
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing product ID" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const [result] = (await pool.query(
      `UPDATE products SET 
        status = ?,
        updated_at = ?
       WHERE id = ? AND status = ?`, // Only update if record is Active
      ["Inactive", now, id, "Active"]
    )) as [any, any];

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: "Product not found or already inactive" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error soft deleting product:", error);
    return NextResponse.json(
      { error: "Failed to soft delete product" },
      { status: 500 },
    );
  }
}