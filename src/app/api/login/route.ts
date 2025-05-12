import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Basic simulated authentication (replace with your actual authentication logic)
    if (username === 'user' && password === 'password') {
      // Simulate a successful login
      const user = { userId: 'user123', username: 'user' };
      // The login function in src/lib/auth.ts will handle setting cookies based on this response.
      return NextResponse.json(user, { status: 200 });
    } else {
      // Simulate invalid credentials
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ message: 'An unexpected error occurred during login.' }, { status: 500 });
  }
}
