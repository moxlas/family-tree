import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-loading">
          <h1>Something went wrong.</h1>
          <p>Please reload the page. If the problem continues, contact support.</p>
          <button
            className="button primary"
            onClick={() => window.location.reload()}
            type="button"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
