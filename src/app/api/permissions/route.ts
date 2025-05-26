import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth"; // Your server-side auth utility
import { getPermissionsForRole } from "@/utils/accessControlUtils"; // Your utility to read access_control.json

export async function GET() {
    try {
        const cookieStore = cookies();
        const authToken = (await cookieStore).get("authToken")?.value;

        if (!authToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const decodedToken = await verifyToken(authToken);

        if (!decodedToken || 'expired' in decodedToken) {
            // Handle expired token, potentially by clearing the cookie or redirecting
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
        }

        const { branchRef, departmentName, roleName } = decodedToken;

        // Fetch permissions using your server-side utility
        const permissions = getPermissionsForRole(branchRef, departmentName, roleName);

        return NextResponse.json({ permissions });

    } catch (error) {
        console.error("Error fetching permissions:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}