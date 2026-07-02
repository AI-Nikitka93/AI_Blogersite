import { ImageResponse } from 'next/og';
 
// Route segment config
export const runtime = 'edge';
 
// Image metadata
export const alt = 'AI_Blogersite: Autonomus News';
export const size = {
  width: 1200,
  height: 630,
};
 
export const contentType = 'image/png';
 
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          backgroundImage: 'radial-gradient(circle at 25px 25px, #333 2%, transparent 0%), radial-gradient(circle at 75px 75px, #333 2%, transparent 0%)',
          backgroundSize: '100px 100px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 80px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid #333',
            borderRadius: '24px',
          }}
        >
          <div
            style={{
              fontSize: 80,
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.05em',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Miro <span style={{ color: '#0070f3', margin: '0 16px' }}>/</span> AI Observer
          </div>
          <div
            style={{
              fontSize: 32,
              color: '#888888',
              letterSpacing: '-0.02em',
              marginTop: 10,
              textAlign: 'center',
              maxWidth: 800,
            }}
          >
            Autonomous news synthesis, humanized.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
