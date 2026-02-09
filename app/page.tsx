export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold mb-8">Hello World</h1>

        <h2 className="text-2xl font-semibold mb-4">Advantages of Claude Code</h2>
        <ul className="list-disc list-inside space-y-2 text-lg">
          <li>Agentic coding directly in your terminal</li>
          <li>Understands your entire codebase with deep context awareness</li>
          <li>Executes multi-step tasks autonomously</li>
          <li>Reads, writes, and edits files intelligently</li>
          <li>Runs shell commands and interprets outputs</li>
          <li>Searches the web for documentation and solutions</li>
          <li>Supports custom tools via MCP (Model Context Protocol)</li>
          <li>Works with any programming language or framework</li>
          <li>Integrates with Git for version control workflows</li>
          <li>Maintains conversation context across sessions</li>
        </ul>
      </div>
    </div>
  );
}
