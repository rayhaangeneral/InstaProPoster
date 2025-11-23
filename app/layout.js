export const metadata = {
    title: 'Instagram Auto-Poster',
    description: 'Automated Instagram video posting system with scheduling',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
