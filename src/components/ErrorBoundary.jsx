import { Component } from "react";

// Catches any render error so a single broken component can't white-screen the whole app
// mid-study-session. Shows a calm recovery screen instead.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("App error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full items-center justify-center bg-stone-50 p-8">
          <div className="max-w-md rounded-xl border border-stone-200 bg-white p-8 text-center">
            <div className="text-3xl">😵</div>
            <h1 className="mt-3 text-lg font-semibold text-stone-800">Something broke</h1>
            <p className="mt-2 text-sm text-stone-500">
              Your progress is saved. Reload to continue — if it keeps happening, the message below helps debug.
            </p>
            <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-stone-100 p-3 text-left text-xs text-stone-500">
              {String(this.state.error?.message || this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
