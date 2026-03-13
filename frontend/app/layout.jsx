import "./globals.css";

export const metadata = {
  title: "GreenWave — Emergency Corridor System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}