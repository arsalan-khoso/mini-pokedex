const TEAM_FIELDS = /* GraphQL */ `
  id
  name
  pokemon_ids
  created_at
  Trainer {
    name
  }
`;

export const GET_TEAMS_QUERY = /* GraphQL */ `
  query GetTeams {
    allTeams(sortField: "created_at", sortOrder: "desc") {
      ${TEAM_FIELDS}
    }
  }
`;

/** json-graphql-server's `q` filter is a case-insensitive "contains" match across fields. */
export const FIND_TEAMS_BY_NAME_QUERY = /* GraphQL */ `
  query FindTeamsByName($name: String!) {
    allTeams(filter: { q: $name }) {
      name
    }
  }
`;

export const CREATE_TEAM_MUTATION = /* GraphQL */ `
  mutation CreateTeam(
    $trainerId: ID!
    $name: String!
    $pokemonIds: [Int]!
    $createdAt: String!
  ) {
    createTeam(
      trainer_id: $trainerId
      name: $name
      pokemon_ids: $pokemonIds
      created_at: $createdAt
    ) {
      ${TEAM_FIELDS}
    }
  }
`;

export const REMOVE_TEAM_MUTATION = /* GraphQL */ `
  mutation RemoveTeam($id: ID!) {
    removeTeam(id: $id) {
      id
    }
  }
`;
