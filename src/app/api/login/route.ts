import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { username, password } = req.body;

    // Basic simulated authentication (replace with your actual authentication logic)
    if (username === 'user' && password === 'password') {
      // Simulate a successful login
      const user = { userId: 'user123', username: 'user' };
      res.status(200).json(user);
    } else {
      // Simulate invalid credentials
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}