import { athletiqColors } from '@athletiq/ui';

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: athletiqColors.background,
        color: athletiqColors.ink,
        padding: 24,
      }}
    >
      <section style={{ maxWidth: 720 }}>
        <p style={{ color: athletiqColors.green, fontWeight: 700, margin: 0 }}>ATHLETIQ</p>
        <h1 style={{ color: athletiqColors.navy, fontSize: 42, lineHeight: 1.1, margin: '12px 0' }}>
          Track the Rise. Train the Future.
        </h1>
        <p style={{ color: athletiqColors.muted, fontSize: 18, lineHeight: 1.6, margin: 0 }}>
          Verified athlete identity and tournament infrastructure for school sports.
        </p>
      </section>
    </main>
  );
}
