import "./globals.css";
export const metadata = {
  title: "AI Cover The World - Reel Generator",
  description: "Generate a short Instagram-ready video (720x1280) in-browser using ffmpeg.wasm",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
