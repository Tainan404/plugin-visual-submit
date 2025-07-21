export const USER_SESSION_CURRENT = `
subscription {
  user_session_current {
    sessionName
  }
}
`;

export const USER_OTHER_SESSIONS_COUNT = `
  subscription {
    user_session_aggregate(where: {
    _and: [
          { _or: [
            {sessionName: {_neq: "visualSubmitMobileCaptureSession"}},
            {sessionName: {_is_null: true}}
          ]},
          {connectionsAlive: {_gt: 0}}
        ]
    }) {
      aggregate {
        count
      }
    }
  }
`;
