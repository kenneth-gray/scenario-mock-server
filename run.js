/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('node:fs');
const path = require('node:path');

const { buildSchema, parse, execute } = require('graphql');
// const {} = require('graphql')

const schemaString = fs.readFileSync(
	path.join(__dirname, './example/schema.gql'),
	{
		encoding: 'utf-8',
	},
);

const schema = buildSchema(schemaString);

const query = `
query UserTest($userId: ID!) {
  user(id: $userId) {
    name
    email
  }
  users {
    name
    email
    friends {
      name
      email
    }
  }
}
`;

const mutation = `
mutation CreateUser($input: UserInput!) {
  createUser(input: $input) {
    id
    friends {
      name
    }
  }
}
`;

const document = parse(mutation);

const result = execute({
	schema,
	document,
	variableValues: {
		userId: 'c2fd1540-4c49-58fa-aaad-536e82f87f13',
		input: { name: 'Bob Smith', email: 'bob.smith@example.com' },
	},
	rootValue: {
		user: () => ({ name: 'cheese', email: 'cheese@blue.com' }),
		users: () => [
			{ name: 'cheese', email: 'cheese@blue.com', friends: () => [] },
		],
		createUser: () => ({ id: '' }),
		User: () => {
			return { friends: [] };
		},
	},
	typeResolver: (value) => {
		console.log({ value });
	},
});

console.dir({ result }, { depth: null });
