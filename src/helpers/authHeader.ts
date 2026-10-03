import axios from "axios";

// /api/exercise und /api/topic verlangen fuer Anlegen, Aendern und Loeschen ein
// Token im Header "x-auth-token". Dieses Skript besorgt ein solches Token, damit
// die Testskripte ohne Passwort auskommen.
//
// Mit den Umgebungsvariablen TEST_EMAIL und TEST_PASSWORD wird damit angemeldet.
// Ohne sie wird ein Wegwerf-Benutzer angelegt, denn /api/register schickt das
// Token gleich mit.
export async function authConfig(
  baseURL = "http://localhost:8080"
): Promise<{ headers: Record<string, string> }> {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (email && password) {
    try {
      const login = await axios.post<{ token: string }>(`${baseURL}/api/login`, {
        email,
        password,
      });
      console.log(`Logged in with ${email}`);
      return { headers: { "x-auth-token": login.data.token } };
    } catch (error) {
      console.warn(
        "Login with TEST_EMAIL failed, so a throwaway user is created instead."
      );
    }
  }

  const neueEmail = `test-${Date.now()}-${Math.floor(
    Math.random() * 1000
  )}@example.com`;
  const registration = await axios.post<{ token: string }>(
    `${baseURL}/api/register`,
    { name: "Test User", email: neueEmail, password: "test1234" }
  );
  console.log(`Created the throwaway user ${neueEmail}`);
  return { headers: { "x-auth-token": registration.data.token } };
}

export default authConfig;
