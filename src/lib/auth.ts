import Cookies from 'js-cookie';

export const logout = async (): Promise<void> => {
  try {
    await fetch('/api/logout', { method: 'POST' });
  } catch (error) {
    console.error('Logout failed:', error);
  } finally {
    Cookies.remove('user');
  }
};

export const login = async (username: string, password: string): Promise<{ username: string; userId: string } | null> => {
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      const user = await response.json();
      // Store user information (e.g., in a cookie or local storage)
      // Using js-cookie for simplicity, consider HTTP-only cookies for better security
      Cookies.set('user', JSON.stringify(user), { expires: 7 }); // Expires in 7 days
      return user;
    } else {
      // Handle login errors (e.g., incorrect credentials)
      const errorData = await response.json();
      console.error('Login failed:', errorData.message);
      return null;
    }
  } catch (error) {
    console.error('Login failed:', error);
    return null;
  }
};

export const getCurrentUser = (): { username: string } | null => {
  const userCookie = Cookies.get('user');
  return userCookie ? JSON.parse(userCookie) : null;
};

export const isAuthenticated = (): boolean => {
  return !!Cookies.get('user');
};