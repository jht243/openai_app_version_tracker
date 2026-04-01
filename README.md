# OpenAI Apps Version Control

A powerful version control and tracking system for OpenAI App Submissions. This application helps developers manage their app lifecycle, track test cases, and handle submission histories between different environments.

## Features

- **App Management:** Track multiple apps, their statuses (draft, pending, approved, etc.), and metadata.
- **Version Control:** Manage multiple versions of your app's configuration and submission data.
- **Test Case Management:** Store and organize positive and negative test cases for your MCP tools.
- **Hydration Support:** Guidance and templates for implementing hydration logic.
- **Supabase Integration:** Real-time data storage and management.
- **Modern UI:** Built with Next.js, Shadcn UI, and Tailwind CSS.

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jonathanpipeline2026/openai_apps_version_control.git
   cd openai_apps_version_control
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Seeding Mock Data

To quickly test the application with sample data, you can run the seed script:

```bash
npm run seed:mock
```

## Contributing

We welcome contributions! Please feel free to suggest changes via issues or pull requests.

## License

This project is open-source and available under the MIT License.

---
*Created by [jonathanpipeline2026](https://github.com/jonathanpipeline2026)*
