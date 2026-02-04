# Sri AB Teachings - API Reference

**Version:** 1.2.0
**Last Updated:** 2026-01-21
**Base URL:** `/api`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Chat API](#chat-api)
3. [Conversations API](#conversations-api)
4. [Daily Teaching API](#daily-teaching-api)
5. [Prompts API](#prompts-api)
6. [AI Settings API](#ai-settings-api)
7. [Admin - Documents API](#admin---documents-api)
8. [Admin - Members API](#admin---members-api)
9. [Admin - Audit API](#admin---audit-api)
10. [Error Handling](#error-handling)

---

## Authentication

All API endpoints require authentication via Supabase Auth session.

### Headers Required

```http
Cookie: sb-access-token=<access_token>; sb-refresh-token=<refresh_token>
```

### Authentication Check Pattern

All endpoints verify authentication using:

```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### Common Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | No valid session or expired token |
| 403 | Forbidden | User lacks permission for this action |

---

## Chat API

### Send Message

Send a message and receive an AI-powered response with semantic search.

```http
POST /api/chat
```

#### Request Body

```json
{
  "conversationId": "uuid | null",
  "message": "string",
  "language": "pt | en | es"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `conversationId` | UUID or null | No | Existing conversation ID. If null, creates new conversation |
| `message` | string | Yes | User's message text |
| `language` | string | No | Response language (default: "pt") |

#### Response

```json
{
  "conversationId": "uuid",
  "message": {
    "id": "uuid",
    "role": "assistant",
    "content": "string",
    "sources": [
      {
        "documentName": "string",
        "sourceName": "string",
        "youtubeUrl": "string | null"
      }
    ],
    "created_at": "timestamp"
  }
}
```

#### Errors

| Status | Error | Cause |
|--------|-------|-------|
| 400 | Message is required | Empty message field |
| 429 | Rate limit exceeded | Too many requests |
| 500 | Failed to process message | AI or database error |

---

## Conversations API

### List Conversations

Get all conversations for the authenticated user.

```http
GET /api/conversations
```

#### Response

```json
{
  "conversations": [
    {
      "id": "uuid",
      "title": "string | null",
      "created_at": "timestamp",
      "updated_at": "timestamp",
      "message_count": "number"
    }
  ]
}
```

### Get Conversation Messages

Retrieve all messages from a specific conversation.

```http
GET /api/conversations/[id]
```

#### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Conversation ID |

#### Response

```json
{
  "conversation": {
    "id": "uuid",
    "title": "string | null",
    "created_at": "timestamp"
  },
  "messages": [
    {
      "id": "uuid",
      "role": "user | assistant",
      "content": "string",
      "sources": "json | null",
      "created_at": "timestamp"
    }
  ]
}
```

### Delete Conversation

Delete a conversation and all its messages.

```http
DELETE /api/conversations/[id]
```

#### Response

```json
{
  "success": true
}
```

---

## Daily Teaching API

### Search Teachings

Search for relevant teachings by topic using semantic search.

```http
POST /api/daily-message/search
```

#### Request Body

```json
{
  "topic": "string",
  "language": "pt | en | es",
  "limit": "number"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `topic` | string | Yes | - | Search topic/theme |
| `language` | string | No | "pt" | Filter by language |
| `limit` | number | No | 10 | Max results to return |

#### Response

```json
{
  "results": [
    {
      "id": "uuid",
      "content": "string",
      "documentName": "string",
      "sourceName": "string",
      "similarity": "number",
      "metadata": {
        "language": "string",
        "youtube_url": "string | null"
      }
    }
  ]
}
```

### Generate Daily Message

Generate an inspirational message from selected teachings.

```http
POST /api/daily-message/generate
```

#### Request Body

```json
{
  "topic": "string",
  "selectedChunks": [
    {
      "id": "uuid",
      "content": "string",
      "documentName": "string",
      "sourceName": "string"
    }
  ],
  "language": "pt | en | es",
  "aiProvider": "claude | chatgpt | gemini",
  "promptId": "uuid | null",
  "customPrompt": "string | null"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `topic` | string | Yes | - | Message topic |
| `selectedChunks` | array | Yes | - | Selected teaching chunks (min 1) |
| `language` | string | No | "pt" | Output language |
| `aiProvider` | string | No | "claude" | AI provider to use |
| `promptId` | UUID | No | null | Custom prompt ID to use |
| `customPrompt` | string | No | null | Override prompt text |

#### Response

```json
{
  "message": "string",
  "id": "uuid",
  "created_at": "timestamp",
  "ai_provider": "string",
  "ai_model": "string"
}
```

#### Errors

| Status | Error | Cause |
|--------|-------|-------|
| 400 | Topic is required | Missing topic |
| 400 | At least one teaching must be selected | Empty selectedChunks |
| 400 | Invalid AI provider | Provider not in [claude, chatgpt, gemini] |
| 400 | No API key configured for {Provider} | User has no API key for selected provider |
| 401 | Invalid API key for {Provider} | API key is invalid or expired |
| 500 | Failed to generate with {Provider} | AI provider error |

### Test API Key

Test if an API key is valid for a provider.

```http
POST /api/daily-teaching/test-api
```

#### Request Body

```json
{
  "provider": "claude | chatgpt | gemini",
  "apiKey": "string"
}
```

#### Response (Success)

```json
{
  "success": true,
  "message": "API key for Claude is valid!"
}
```

#### Response (Failure)

```json
{
  "success": false,
  "error": "Invalid API key. Please check and try again."
}
```

---

## Prompts API

### List Prompts

Get all custom prompts for the authenticated user.

```http
GET /api/prompts
```

#### Response

```json
{
  "prompts": [
    {
      "id": "uuid",
      "name": "string",
      "content": "string",
      "is_default": "boolean",
      "usage_count": "number",
      "last_used_at": "timestamp | null",
      "created_at": "timestamp"
    }
  ]
}
```

### Create Prompt

Create a new custom prompt.

```http
POST /api/prompts
```

#### Request Body

```json
{
  "name": "string",
  "content": "string",
  "is_default": "boolean"
}
```

#### Response

```json
{
  "prompt": {
    "id": "uuid",
    "name": "string",
    "content": "string",
    "is_default": "boolean",
    "usage_count": 0,
    "created_at": "timestamp"
  }
}
```

### Update Prompt

Update an existing prompt.

```http
PUT /api/prompts
```

#### Request Body

```json
{
  "id": "uuid",
  "name": "string",
  "content": "string",
  "is_default": "boolean"
}
```

#### Response

```json
{
  "prompt": {
    "id": "uuid",
    "name": "string",
    "content": "string",
    "is_default": "boolean",
    "updated_at": "timestamp"
  }
}
```

### Delete Prompt

Delete a custom prompt.

```http
DELETE /api/prompts?id={uuid}
```

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Prompt ID to delete |

#### Response

```json
{
  "success": true
}
```

---

## AI Settings API

### Get AI Settings

Get the user's AI provider settings.

```http
GET /api/ai-settings
```

#### Response

```json
{
  "settings": {
    "default_provider": "claude | chatgpt | gemini",
    "anthropic_api_key": "string | null",
    "openai_api_key": "string | null",
    "gemini_api_key": "string | null",
    "claude_model": "string",
    "openai_model": "string",
    "gemini_model": "string",
    "temperature": "number",
    "max_tokens": "number"
  }
}
```

### Save AI Settings

Save or update AI provider settings.

```http
POST /api/ai-settings
```

#### Request Body

```json
{
  "default_provider": "claude | chatgpt | gemini",
  "anthropic_api_key": "string | null",
  "openai_api_key": "string | null",
  "gemini_api_key": "string | null",
  "claude_model": "string",
  "openai_model": "string",
  "gemini_model": "string",
  "temperature": "number (0-1)",
  "max_tokens": "number (100-4000)"
}
```

#### Response

```json
{
  "success": true,
  "settings": { ... }
}
```

### Remove API Key

Remove a specific API key from settings.

```http
DELETE /api/ai-settings?key={keyField}
```

#### Query Parameters

| Parameter | Values | Description |
|-----------|--------|-------------|
| `key` | `anthropic_api_key`, `openai_api_key`, `gemini_api_key` | Field name to clear |

#### Response

```json
{
  "success": true
}
```

---

## Admin - Documents API

> **Note:** Admin endpoints require `role: 'admin'` in user profile or module admin access.

### List Documents

Get all documents with optional filtering.

```http
GET /api/admin/documents
```

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `source` | string | Filter by teaching source slug |
| `status` | string | Filter by status (pending, processing, processed, error) |
| `search` | string | Search in filename |

#### Response

```json
{
  "documents": [
    {
      "id": "uuid",
      "original_filename": "string",
      "storage_path": "string | null",
      "status": "pending | processing | processed | error",
      "chunk_count": "number",
      "metadata": {
        "year": "string",
        "date": "string",
        "language": "string",
        "youtube_url": "string | null"
      },
      "teaching_sources": {
        "id": "uuid",
        "name": "string",
        "slug": "string"
      },
      "created_at": "timestamp"
    }
  ]
}
```

### Upload Document

Upload a new document file.

```http
POST /api/admin/documents
Content-Type: multipart/form-data
```

#### Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | PDF, DOCX, or TXT file |
| `source_id` | UUID | Yes | Teaching source ID |
| `metadata` | JSON string | No | Additional metadata |

#### Response

```json
{
  "document": {
    "id": "uuid",
    "original_filename": "string",
    "status": "pending",
    "created_at": "timestamp"
  }
}
```

### Insert Text Document

Create a document from pasted text content.

```http
POST /api/admin/documents/text
```

#### Request Body

```json
{
  "content": "string",
  "filename": "string",
  "source_id": "uuid",
  "metadata": {
    "language": "string",
    "year": "string",
    "youtube_url": "string"
  }
}
```

#### Response

```json
{
  "document": {
    "id": "uuid",
    "original_filename": "string",
    "status": "pending",
    "created_at": "timestamp"
  }
}
```

### Get Document Preview URL

Get a signed URL to preview/download a document.

```http
GET /api/admin/documents/preview?id={uuid}
```

#### Response

```json
{
  "url": "string (signed URL)",
  "filename": "string"
}
```

### Get Document Text Content

Get the text content of a document (for text files).

```http
GET /api/admin/documents/content?id={uuid}
```

#### Response

```json
{
  "content": "string",
  "filename": "string"
}
```

### Delete Document

Delete a document and its chunks.

```http
DELETE /api/admin/documents?id={uuid}
```

#### Response

```json
{
  "success": true
}
```

### Reprocess Documents

Trigger reprocessing of documents (extract text, generate embeddings).

```http
POST /api/admin/documents/reprocess
```

#### Request Body

```json
{
  "documentIds": ["uuid", "uuid"]
}
```

#### Response

```json
{
  "success": true,
  "processed": "number"
}
```

---

## Admin - Members API

### List Members

Get all organization members.

```http
GET /api/admin/members
```

#### Response

```json
{
  "members": [
    {
      "id": "uuid",
      "email": "string",
      "full_name": "string",
      "role": "admin | member",
      "avatar_url": "string | null",
      "created_at": "timestamp",
      "last_sign_in": "timestamp | null",
      "user_modules": [
        {
          "module_id": "uuid",
          "role": "admin | editor | viewer",
          "modules": {
            "name": "string",
            "slug": "string"
          }
        }
      ]
    }
  ]
}
```

### Invite Member

Send an invitation to a new member.

```http
POST /api/admin/members/invite
```

#### Request Body

```json
{
  "email": "string",
  "role": "admin | member",
  "modules": [
    {
      "module_id": "uuid",
      "role": "admin | editor | viewer"
    }
  ]
}
```

#### Response

```json
{
  "invite": {
    "id": "uuid",
    "email": "string",
    "token": "string",
    "expires_at": "timestamp"
  }
}
```

### Update Member Role

Update a member's system role.

```http
PUT /api/admin/members/[id]/role
```

#### Request Body

```json
{
  "role": "admin | member"
}
```

### Remove Member

Remove a member from the organization.

```http
DELETE /api/admin/members/[id]
```

---

## Admin - Audit API

### Get Audit Logs

Get system audit logs with filtering.

```http
GET /api/admin/audit
```

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `action` | string | Filter by action type |
| `user_id` | UUID | Filter by user |
| `start_date` | ISO date | Start of date range |
| `end_date` | ISO date | End of date range |
| `limit` | number | Max results (default: 100) |

#### Response

```json
{
  "logs": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "action": "string",
      "resource_type": "string",
      "resource_id": "uuid | null",
      "details": {
        "messagePreview": "string",
        "language": "string"
      },
      "ip_address": "string | null",
      "created_at": "timestamp",
      "profiles": {
        "full_name": "string",
        "email": "string"
      }
    }
  ]
}
```

### Get Conversation History

Get all conversations with full message history (admin view).

```http
GET /api/admin/history
```

#### Response

```json
{
  "conversations": [
    {
      "id": "uuid",
      "title": "string | null",
      "created_at": "timestamp",
      "updated_at": "timestamp",
      "profiles": {
        "full_name": "string",
        "email": "string",
        "avatar_url": "string | null"
      },
      "messages": [
        {
          "id": "uuid",
          "role": "user | assistant",
          "content": "string",
          "created_at": "timestamp"
        }
      ]
    }
  ]
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "error": "string"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Not authenticated or invalid API key |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

### Rate Limiting

The API implements rate limiting to prevent abuse:

- **Chat API:** 20 requests per minute per user
- **Generate API:** 10 requests per minute per user
- **Other endpoints:** 100 requests per minute per user

When rate limited, you'll receive:

```json
{
  "error": "Rate limit exceeded. Please wait before trying again."
}
```

---

## AI Provider Models

### Available Models

#### Claude (Anthropic)

| Model ID | Name | Notes |
|----------|------|-------|
| `claude-sonnet-4-20250514` | Claude Sonnet 4 | Default |
| `claude-opus-4-20250514` | Claude Opus 4 | Most capable |
| `claude-3-5-sonnet-20241022` | Claude 3.5 Sonnet | Previous gen |
| `claude-3-5-haiku-20241022` | Claude 3.5 Haiku | Fast |

#### ChatGPT (OpenAI)

| Model ID | Name | Notes |
|----------|------|-------|
| `gpt-4o` | GPT-4o | Default |
| `gpt-4o-mini` | GPT-4o Mini | Fast |
| `gpt-4-turbo` | GPT-4 Turbo | Previous |
| `gpt-3.5-turbo` | GPT-3.5 Turbo | Deprecated |

#### Gemini (Google)

| Model ID | Name | Notes |
|----------|------|-------|
| `gemini-1.5-pro` | Gemini 1.5 Pro | Default |
| `gemini-1.5-flash` | Gemini 1.5 Flash | Fast |
| `gemini-2.0-flash-exp` | Gemini 2.0 Flash | Experimental |

---

## Webhooks (Future)

*Webhook support is planned for future releases.*

---

*This API reference is maintained as part of the Sri AB Teachings documentation.*
