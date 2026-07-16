# Phase 0 Design-Partner Demo Walkthrough

**Audience:** Coach, mentor, or program coordinator
**Duration:** 8-10 minutes
**Purpose:** Demonstrate the problem and proposed workflow without implying that unbuilt pilot features already exist.

## Preparation

- Open the deployed VEXScouting application or a working local environment.
- Ask the participant for one of their team numbers and a recent event.
- Use their real team and event when possible.
- State clearly which screens are live and which workflow is proposed for the pilot.

## Script

### 1. Establish current public data: 2 minutes

Search for the participant's team. Show its skills, event history, awards, comparison, and match information.

Say:

> This public-data layer is already working and will remain free. I am not asking programs to pay for a prettier copy of information they can find elsewhere.

Ask whether any displayed metric was used at their last event and where they currently look it up.

### 2. Show the decision context: 2 minutes

Open a recent event and its match/team information. If prediction mode is available, present it as an experimental signal, not a validated probability.

Say:

> The current prediction percentage is not yet calibrated well enough to be sold as an accuracy promise. The paid-product hypothesis is the private workflow around decisions, not this number alone.

Ask what the coach needed to know about these teams that public data did not provide.

### 3. Walk through the proposed private workspace: 3 minutes

Explain the proposed sequence without pretending the screens are complete:

```text
Create event workspace
  -> invite scouts
  -> assign teams or matches
  -> record structured observations and notes
  -> combine observations with public metrics
  -> reorder and complete an alliance pick list
  -> export the program's data
```

Use the fields from the implementation plan: reliability, driver skill, defense, autonomous quality, penalty risk, tags, notes, author, and timestamp.

Ask the participant to identify the first point where this differs from their current process.

### 4. Present the pilot exchange: 1 minute

Open `docs/business/phase-0-design-partner-offer.md` and summarize:

- Free for one named competition.
- One coach owner and at least two scouts.
- Target of 20 observations and a completed pick list.
- Onboarding and post-event debrief required.
- No purchase obligation.

### 5. Ask for a concrete commitment: 2 minutes

Ask:

1. Which upcoming event could be used?
2. Who would own setup?
3. Which two or more scouts would participate?
4. What must work for the coach to trust it on event day?
5. Can an onboarding date be scheduled now?

Record the answers in `docs/business/phase-0-discovery-kit.md`. Do not mark the pilot confirmed without a named event and coach/mentor owner.

## Demo Evidence

After each demo, record:

```text
Date:
Program:
Participant role:
Team/event demonstrated:
Current workflow artifact shown:
Repeated problem confirmed:
Named pilot event:
Coach/mentor owner:
Expected scouts:
Onboarding date:
Objections:
Status: interest only / invited / confirmed
```
