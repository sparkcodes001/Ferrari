import { Component } from "react";

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <pre
          style={{
            color: "red",
            padding: 20,
            position: "relative",
            zIndex: 100,
            whiteSpace: "pre-wrap",
          }}
        >
          {String(this.state.error.stack || this.state.error)}
        </pre>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
