import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surface the real error in the console instead of a silent white screen.
    console.error('MemoCare crashed while rendering:', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
          fontFamily: 'sans-serif',
        }}>
          <h2 style={{ marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: '#666', marginBottom: 16, maxWidth: 480 }}>
            This screen hit an unexpected error. Details were logged to the browser console (press F12).
          </p>
          <pre style={{
            background: '#f5f5f5',
            padding: 12,
            borderRadius: 8,
            maxWidth: '90%',
            overflow: 'auto',
            fontSize: 12,
            color: '#b00020',
            marginBottom: 16,
          }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={this.handleReset} style={{ padding: '8px 16px', cursor: 'pointer' }}>
              Try again
            </button>
            <button onClick={() => window.location.assign('/dashboard')} style={{ padding: '8px 16px', cursor: 'pointer' }}>
              Go to dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
