# CJS Purchase API

This is a lightweight Express API to initiate CJS token purchases via HTTP POST.

## Route

**POST** `/buycjs`

```json
{
  "userId": "some-user-id",
  "amount": 10
}

