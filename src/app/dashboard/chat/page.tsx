import AIChatbot from '@/components/AIChatbot';
import styles from './page.module.css';

export default function ChatPage() {
    return (
        <div className={styles.container}>
            <h1 className={styles.title}>AI Helper</h1>
            <div style={{ flex: 1, minHeight: '600px', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                <AIChatbot />
            </div>
        </div>
    );
}
