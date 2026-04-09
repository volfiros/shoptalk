# ShopTalk

A voice support assistant for e-commerce platforms.

Demo: [ShopTalk Demo](https://www.tella.tv/video/shop-talk-ai-voice-assistant-demo-1k3d)

Note: This demo showcases the first working version of ShopTalk. Since then, I have revamped the UI, added new features, and refactored the codebase for better maintainability.

---

## Why I Built This

I wanted to explore voice agents. My goal was to create a practical tool that e-commerce businesses could integrate into their platforms, allowing customers to get order and return information through natural conversation rather than navigating complex menus or waiting on hold.

Voice interactions feel more human and accessible. Instead of typing "Where is my order?" and clicking through tracking pages, a customer can simply ask the question out loud and get an immediate, spoken response. That simplicity is what makes this technology useful in practice.

The specific use case is customer support for e-commerce: answering common questions about orders, returns, and refund policies without requiring a human agent.

---

## Technical Decisions

### Why Gemini Live API

I evaluated several approaches before deciding on Gemini Live API.

The traditional route would have been building a custom pipeline with a separate speech-to-text model, a reasoning layer, and a text-to-speech engine. That works for some applications, but it adds complexity and latency. Each step in the pipeline introduces potential points of failure and makes the system harder to maintain.

I wanted a solution that felt natural and seamless for voice conversations. Gemini Live API provided that. The API handles both the reasoning and the interaction end-to-end, which means the AI can listen, think, and respond in real time without me stitching together multiple services.

For this use case, the default Gemini 3 model is sufficient. The assistant does not need heavy reasoning capabilities. It needs to understand straightforward questions, use tools to fetch the right data, and respond clearly. Gemini Live handles that well, and the tool-calling functionality lets me keep answers grounded in the actual order and policy data rather than letting the model generate guesses.

### Why a Web UI

I chose to build a browser-based interface because voice input and voice output are much easier to demonstrate and test visually. A CLI would have been functional, but a UI makes it immediately clear how the interaction works and how a customer would actually use it.

The tradeoff is extra frontend work, but it results in a better demonstration of the product vision.

### Design Decisions

A few other choices shaped the implementation:

- Local JSON data: The order and policy information lives in local files. The assistant reads this data through tool calls rather than generating answers from memory. This keeps responses accurate and verifiable.

- Session-only key storage: The Gemini API key is stored in browser session storage. No database, no authentication system. It is simple and sufficient for a demo, though I would handle secrets differently in production.

- Continuous conversation over push-to-talk: After starting a chat session, the conversation stays live. The system handles pauses, interruptions, and turn-taking based on silence and assistant responses. This feels more natural than pressing a button for each exchange.

---

## My Workflow

I use a hybrid approach. AI accelerates the work, but I stay involved in every decision.

### How I Use AI Coding Tools

I do not rely on a single model. Different models excel at different tasks.

- GPT-5.4: building projects from scratch. I provide detailed specifications and let the model generate the initial codebase.

- MiniMax-M2.7: analyzing codebases, adding features, fixing errors, refactoring, and code quality testing. It is fast, cost-effective, and has generous usage limits.

- Gemini 3.1 Pro: UI refinements and design work.

- GLM-5.1: building up plans and outlining development steps before implementation.

I use a Pi coding agent as a harness, which lets me combine tools like GitHub Copilot, GLM coding plans, and Gemini API models depending on what the task requires.

### AI Skills I Rely On

Several skills keep my workflow structured:

- brainstorming: at the start of each session to clarify goals and constraints before writing any code.

- frontend-design: for building the interface in a way that is both functional and clean.

- tailwind-design-system: for building scalable UI patterns with Tailwind CSS.

- playwright: for automating browser testing and debugging UI flows.

- gh-address-comments: for addressing code review comments on pull requests.

- gh-fix-ci: for debugging and fixing failing CI/CD pipelines.

- executing-plans: for managing multi-step development work without losing track of what is done and what is next.

- test-driven-development: to validate the application as it grows. Tests are written alongside features, not after.

- verification-before-completion: to confirm that all changes are working before I consider a task complete.

### Tools I Use

I also use several tools to support my development workflow:

- visit-webpage: for fetching and extracting content from web pages, documentation, and articles. This helps me research existing solutions and understand how things work.

- web-search: for finding relevant documentation, facts, and current information during the research phase of a project.

- github: for interacting with GitHub repositories, checking pull requests, CI status, and managing code collaboration.

- plannotator: for viewing my project plans on a webpage where I can leave comments, make changes, and give feedback directly in the plan.

### Where I Step In

AI generates fast, but it is not always right. I test the product every time the AI makes changes. I review the code to catch errors, inconsistencies, or missed edge cases. When the AI cannot resolve a specific error, I fix it manually.

This hybrid approach works because I know when to rely on AI and when to step in myself. I use AI to move faster, but I stay involved in every decision to make sure the quality is there.

---

## Tips and Tricks for AI Coding

If someone is getting started with AI coding tools, here is what has worked for me:

1. Use multiple models, not just one. Different models are better at different things. A multi-model workflow gives you the strengths of each without being locked into the limitations of any single one.

2. Use specialized tools, not just the model. A Pi coding agent with integrated tools like GitHub Copilot, Gemini API, and planning features produces better results than prompting a model in isolation.

3. Start with a spec, not a blank page. The quality of AI output depends heavily on the quality of your input. Writing out detailed specifications before generating code results in better, more consistent implementations.

4. Review everything AI generates. AI makes mistakes. It can write code that looks right but is actually wrong. It misses edge cases and creates inconsistent naming and structure. Manual review catches these problems before they become bigger issues.

5. Write tests alongside features. When you write tests as you build, you get a clear way to check that the code does what it should. This is especially useful when working with AI, because it helps confirm that the AI's work is actually correct.

6. Iterate, do not expect perfection in one shot. AI works best when you build incrementally, review, and refine. Expect to prompt, review, and adjust multiple times.

7. Know your own strengths. AI can write code, but you still need product thinking to decide what to build and why. That combination of AI execution and human direction is what makes the workflow powerful.

---

## What I Bring

My primary strength is product thinking. I can take a vague idea and turn it into a working product relatively quickly with AI assistance. But I do not just build for the sake of building. I start by researching what exists, identifying gaps, and deciding what would actually be useful.

For ShopTalk, I wanted to explore how voice agents could work in customer support. I saw an opportunity to build something practical that lets customers get help through natural conversation instead of navigating menus or waiting on hold.

What makes me different is the hybrid approach. I use AI to help build faster, but I stay involved throughout the process. I test everything, review the code, and make sure the final product actually works the way it should.

I believe that is the right mindset for working at a fast-moving startup: someone who can build quickly, think clearly about product decisions, and take ownership of the outcome rather than just executing prompts.
