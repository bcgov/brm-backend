# BRM (Business Rules Management) Backend

This project is the Backend for the SDPR Business Rules Engine (BRE) and [BRM App](https://github.com/bcgov/brm-app).

## Local Development Setup

### Running MongoDB Locally

A local MongoDB instance is required for the project to run properly. You'll have to set this up first and create a database for it.

## Setting up MongoDB

To set up MongoDB and populate it with initial data, follow these steps:

1. Ensure you have Docker and Docker Compose installed on your machine.
2. Run the following command to start the MongoDB container:

   ```sh
   docker-compose up -d
   ```

### Including Rules from the Rules Repository

To get access to rules locally on your machine simply clone the repo at https://github.com/bcgov/brms-rules into your project. This project is set to grab rules from `brms-rules/rules`, which is the default location of rules if that project is cloned into this one.

```bash
git clone https://github.com/bcgov/brms-rules.git
```

### Setting Environment Variables

Before running your application locally, you'll need some environment variables. You can create a `.env` file to do so. Set the following variables:

- MONGODB_URL: The URL for connecting to the MongoDB instance you created in the previous step. Should be mongodb://localhost:27017/brms-db.
- FRONTEND_URI: The URI for the frontend application. Set it to http://localhost:8080.
- GITHUB_RULES_BRANCH: Specifies which branch Klamm is syncing with
- GITHUB_TOKEN: Optional github token to mitigate issues with rate limiting
- GITHUB_APP_CLIENT_ID
- GITHUB_APP_CLIENT_SECRET
- KLAMM_API_URL: The base URL of your Klamm API
- KLAMM_API_AUTH_TOKEN: The Klamm API auth token

### Running the Application

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

The API will now be available at [http://localhost:3000](http://localhost:3000).

## How to Contribute

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## License

```
Copyright 2024 Province of British Columbia

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
