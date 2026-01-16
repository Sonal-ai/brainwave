import Sidebar from '@/components/Sidebar/Sidebar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
            <Sidebar />
            <div style={{
                flex: 1,
                marginLeft: '260px',
                padding: '32px',
                maxWidth: 'calc(100vw - 260px)'
            }}>
                {children}
            </div>
        </div>
    );
}
