# Live Trading Signal Announcer — Bot specification

**Archetype:** custom

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

Monitors user-selected Telegram channels/private chats, joins active voice chats to read new messages live using TTS for immediate audible trading signals without requiring manual Telegram interaction.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- single owner/operator
- trading professionals

## Success criteria

- Immediate voice chat join and message read for monitored chats when active voice chat exists
- Persistent storage of monitored chat list and settings
- Accurate TTS synthesis with configurable voice profile

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open main configuration menu
- **/monitor** (command, actor: user, command: /monitor) — Manage monitored chat list (add/remove/enable/disable)
  - inputs: chat ID/invite link
  - outputs: chat list confirmation
- **/status** (command, actor: user, command: /status) — Show current monitoring status and recent activity log
- **/set_voice** (command, actor: user, command: /set_voice) — Configure TTS voice profile (gender/speed)
- **Enable Chat** (button, actor: user, callback: monitor:enable) — Toggle monitoring for selected chat
- **Mute Chat** (button, actor: user, callback: monitor:mute) — Temporarily pause audio notifications for chat

## Flows

### Setup
_Trigger:_ /start

1. Authenticate owner account
2. Display available chat selection
3. Store initial monitored list

_Data touched:_ owner account, monitored chats

### Message Handling
_Trigger:_ New message in monitored chat

1. Check if voice chat active
2. If active: join voice chat
3. Synthesize TTS audio
4. Stream audio to voice chat
5. Log activity

_Data touched:_ incoming message, voice session

### Status Check
_Trigger:_ /status

1. Display monitored list status
2. Show recent 5 activity logs
3. Highlight any failed joins

_Data touched:_ monitored chats, activity log

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **Owner Account** _(retention: persistent)_ — Single authenticated user with full control
  - fields: telegram ID, TTS preferences
- **Monitored Chat** _(retention: persistent)_ — Telegram channel/chat with monitoring status
  - fields: chat ID, enabled, mute state, last message timestamp
- **Incoming Message** _(retention: session)_ — Text content from monitored source
  - fields: message text, source chat ID, timestamp
- **Voice Session** _(retention: session)_ — Active voice chat participation
  - fields: session ID, start/end timestamps, success status

## Integrations

- **Telegram** (required) — Bot API messaging and voice chat access
- **Text-to-Speech** (required) — Audio synthesis for message reading
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Add/remove monitored chats
- Enable/disable monitoring per chat
- Mute/unmute audio notifications
- Configure TTS voice profile
- View status and activity logs

## Notifications

- Failed voice chat join notification
- Message truncation warning
- Activity log updates

## Permissions & privacy

- Single-owner data isolation
- No access to non-monitored chats
- Secure storage of configuration

## Edge cases

- No active voice chat in monitored channel
- Multiple messages during active read
- Long message truncation
- Owner account deauthentication

## Required tests

- End-to-end voice chat join/read flow
- Mute state behavior validation
- Message queue handling during active reads
- Failed join notification delivery

## Assumptions

- Single owner model
- Immediate message reading without batching
- Default TTS voice selected by developer
- No multi-user support
