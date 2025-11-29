import React, { useState } from "react";
import FormPage from "./pages/FormPage.jsx";
import SubmissionsPage from "./pages/SubmissionsPage.jsx";

export default function App() {
  const [route, setRoute] = useState("form");
  return (
    <div className="min-h-screen p-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">
          MatBook — Employee Onboarding
        </h1>
        <nav>
          <button
            className="mr-2 px-3 py-1 rounded bg-white border"
            onClick={() => setRoute("form")}
          >
            Form
          </button>
          <button
            className="px-3 py-1 rounded bg-white border"
            onClick={() => setRoute("subs")}
          >
            Submissions
          </button>
        </nav>
      </header>

      <main>
        {route === "form" ? (
          <FormPage onSuccess={() => setRoute("subs")} />
        ) : (
          <SubmissionsPage />
        )}
      </main>
    </div>
  );
}
