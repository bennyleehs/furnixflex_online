import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Your logic to fetch FTP logs here
    // For example:
    const logs: never[] = []; // Replace with your actual data fetching logic

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching FTP logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch FTP logs' },
      { status: 500 }
    );
  }
}