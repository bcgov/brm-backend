# BRM (Business Rules Management) Backend

This project is the Backend for the [BRM App](https://github.com/bcgov/brm-app), supporting business rule authoring and execution. It was made for SDPR's Business Rules Engine (BRE).

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

To get access to rules locally on your machine simply clone your repo into the project and ensure the rules are placed at the brm-backend/rules/prod location (for main branch/production rules) or brm-backend/rules/dev location (for dev branch/dev rules).

For example:

```bash
git clone https://github.com/bcgov/brms-rules.git
```

```bash
cp -r brms-rules/rules/* brm-backend/rules/prod
```

### Setting Environment Variables

Before running your application locally, you'll need some environment variables. You can create a `.env` file to do so. Set the following variables:

- MONGODB_URL: The URL for connecting to the MongoDB instance you created in the previous step. Should be mongodb://localhost:27017/brms-db.
- FRONTEND_URI: The URI for the frontend application. Set it to http://localhost:8080.
- GITHUB_RULES_REPO: Set to whatever your GitHub rules repo is, like `bcgov/brms-rules`
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

## Code Formatting

We use [Prettier](https://prettier.io/) to automatically format code in this project. The configuration can be found in the `.prettierrc` file.

For the best experience, we recommend installing the following editor plugins:

- **Prettier – Code formatter**
- **Formatting Toggle** (to easily enable/disable formatting when needed)

## CI/CD Pipeline

This project uses **GitHub Actions** for CI/CD workflows, which are defined in the `.github/workflows` folder. The following processes are currently in place:

- **Automated testing**: On every pull request and on merges to the `dev` or `main` branches, Jest unit tests and ESLint checks are automatically run.
- **Docker image build**: When changes are merged into `dev` or `main`, a Docker image is built and pushed to the GitHub Container Registry at `ghcr.io/bcgov/brm-backend`.
- **Deployment**: After the image is built, it is deployed to the appropriate OpenShift environments. These environments are linked via project secrets configured in the repository.

More information about the deployment pipeline is available [here](https://knowledge.social.gov.bc.ca/successor/bre/devops-pipeline).

## Technical Overview

### Stack
- **Language:** TypeScript
- **Framework:** [Nest.js](https://nestjs.com/)
- **Unit Testing:** Jest. Tests are stored next to files they are testing (with a `.spec.ts` suffix).
- **Linting/Formatting:** ESLint, Prettier
- **Database:** MongoDB with Mongoose for ODM
- **Logging:** Winston
- **Documentaiton:** Swagger

### Project Structure
| Directory         | Details           |
| ----------------- | ----------------- |
| src/api           | Each subdirectory here provides a different API base endpoint. Every endpoint subdirectory should have a [controller](https://docs.nestjs.com/controllers) and a [service](https://docs.nestjs.com/providers#services). It will also have any other supporting utils/tests relevant to that endpoint. | 
| src/auth          | Where the auth lives. Has the same controller/service structure mentioned above. Currently provides support for Github OAuth.              |
| src/utils         | Any functions reused throughout the project |
| .github/workflows | CI/CD Pipeline Github Actions |
| helm              | Charts for deploying to OpenShift |


## CSV Rule Testing

The BRM system uses a rules engine where business rules are defined in JSON files and stored in a separate repository. CSV files contain test scenarios for these rules. When rule changes are pushed or when backend app changes are made, these tests verify the rules work as expected. A specialized workflow is implemented to validate these rules:

- Tests are run for rules via the `run-csv-test.ts` file in this repo.
- These tests are run automaticall via a GitHub Actions workflow file in `.github/workflows/csv-rule-tests.yml`
- This can either run specified tests only or all tests within the rules repositories in the `RULES_REPOSITORIES` project variable.
- These tests are stored in the related rules repository in the `/tests` directory. The tests are stored at the same path of the rule they relate to (so tests for `general-supplements/coop-share-purchase.json` should be stored at `tests/general-supplements/coop-share-purchase`).
- Each test contains inputs and expected outputs for business rules.
- The app has functionality for adding these tests to the repository in the relevant place.

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
