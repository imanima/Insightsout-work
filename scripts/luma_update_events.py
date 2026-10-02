#!/usr/bin/env python3
"""Bring the Luma events in line with the four-event system (October 2026).

Dry run (prints what would change, touches nothing):
    LUMA_API_KEY=... python3 scripts/luma_update_events.py
Apply:
    LUMA_API_KEY=... python3 scripts/luma_update_events.py --apply

What it does, per event on the calendar:
  * Oct 8  "How Do I Lead Through Change and Uncertainty?"  keeps its title
           (people have registered) and gets a one-line series note on top.
  * Oct 13 "When Your Role Starts Changing" is renamed "When the Work Changes"
           and gets the series description.
  * "What Should Stay Human?" and "Founder Group Coaching & Peer Support"
           keep their titles and get the refreshed descriptions.
  * Anything else is left alone and listed.

Luma public API: https://docs.luma.com  (needs Luma Plus; key is per calendar).
Update endpoint: POST /v1/event/update with event_api_id and the fields to set.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request

BASE = "https://public-api.luma.com/v1"
UA = "insightsout-site-build/1.0"

FACILITATOR = ("Facilitated by Nima Imani, founder of InsightsOut, ICF-certified leadership coach, "
               "formerly EY and Neo4j.")

COPY = {
    "founder-group": {
        "match": ["founder group coaching"],
        "name": None,  # keep
        "description_md": f"""Building something can be lonely. The decisions keep coming, the relationships around the work get complicated, and there isn't always a place to say what's actually happening.

This is a weekly group coaching and peer support circle for founders, builders, creators, side hustlers, and small business owners.

Bring one real situation: a decision you're stuck on, a co-founder or team tension, a conversation you keep avoiding, or just the feeling that you're carrying too much of it alone.

You can be coached, reflect for someone else, or listen. The group is small and facilitated. No pitching, and no pressure to arrive with a polished story.

**How it goes.** One person brings a real situation. The group listens before offering perspective. We slow the problem down enough to see the person, the relationship, and the system around it. Then the person chooses a next move that feels honest and workable.

**Who it's for.** Founders, creators, builders, side hustlers, and small business owners actively carrying responsibility for something they're building. People who want useful support and honest peers, not another networking event.

**What you leave with.** More clarity about one real situation. A decision, conversation, or experiment to take forward. The experience of not carrying the work alone.

**What to bring.** One real situation from your work or leadership. Stories stay in the room; the learning can leave with you.

{FACILITATOR} Every Friday, 2 pm, SF Commons, North Studio, 550 Laguna St. $10, free for members. More: https://insightsout.work/workshops/founder-group-coaching
""",
    },
    "wssh": {
        "match": ["what should stay human"],
        "name": None,  # keep
        "description_md": f"""We've been through a lot of change as people, and something has always carried us through it.

This session is a chance to look at that honestly, together. We slow down, get clear on what is actually changing in our work and lives, remember what has made us human, and each find our own answer to what should stay human.

Everyone's answer is different. This isn't a debate about whether AI is good or bad, and it isn't a technology class. It's a facilitated space to look at judgment, responsibility, dignity, relationship, creativity, care, and the choices we still want to make ourselves.

Worried or excited, experienced or new to AI, you belong in the room.

We'll reflect on where AI is already changing your work or life. Explore what feels useful, uncertain, or hard to hand over. Hear how other people are drawing their own lines. And choose one principle or decision to carry forward.

**Who it's for.** Anyone thinking about how AI is changing work, learning, relationships, creativity, responsibility, or daily life. No technical background needed.

**What you leave with.** More clarity about your own relationship with AI. One choice made on purpose. A wider view of how other people are navigating the same change.

{FACILITATOR} This is not a sales event in disguise. Free for SF Commons members, $10 suggested for others. The essay behind the session: https://insightsout.work/articles/what-should-stay-human
""",
    },
    "work-changes": {
        "match": ["when your role starts changing", "when the work changes"],
        "name": "When the Work Changes",
        "description_md": f"""The work moved. The role hasn't caught up.

For some people, AI is changing what they do, what they're valued for, and what they should build next.

For managers, the pressure comes from both directions. Leadership wants speed, adoption, and more output. The team wants clarity, a voice, and time to adjust. The manager is left in the middle, expected to communicate a certainty they may not have.

This is a working session for people navigating change from either side: your own role is changing, or you're responsible for leading other people through change.

The room begins together. Then you choose one of two working paths before we come back to a shared conversation: role and identity, or management and team leadership.

We'll separate what has actually changed from what's still uncertain. Identify what you or your team still own. Name the trust, identity, and communication issues underneath the change. Choose the conversation or decision that can't be avoided any longer. And define one capability or practical experiment to begin now.

**Who it's for.** Professionals whose role, value, or identity at work is shifting. Managers and team leads navigating AI adoption, restructuring, new systems, changing priorities, or pressure to move faster. People and organizational leaders responsible for supporting teams through role change.

**What you leave with.** A clear map of the change you're navigating. One conversation or decision to move forward. One capability, experiment, or leadership practice to begin building.

**What to bring.** One real change you're personally navigating or responsible for leading. The session is confidential and advice is not forced.

{FACILITATOR} Also runs inside companies as a manager cohort or team-transition session: https://insightsout.work/workshops/when-the-work-changes
""",
    },
    "managers-oct-8": {
        "match": ["how do i lead through change"],
        "name": None,  # keep: registrations exist
        "prepend_md": "*This is the manager session of **When the Work Changes**, our series for people whose roles are changing and the managers leading them. Details: https://insightsout.work/workshops/when-the-work-changes*\n\n",
    },
}

AGENTS_COPY = f"""AI agents are starting to do work that used to belong to people. They draft, analyze, recommend, decide, and sometimes act.

But most teams haven't agreed on where the line is.

Who decides? Who checks the work? Who answers when an agent gets it wrong? What should always stay human?

Without a shared answer, everyone makes their own rules. One person lets the agent send the client email. Another rewrites everything. Someone else quietly stops trusting the work, or hides how much they use AI.

This is a working session for people building, leading, or working inside human-agent teams. We use real workflows to turn unspoken assumptions into a shared way of working.

We'll decide what should stay human. Define what agents can own. Identify what an agent may prepare but a person must decide. Set the points where human review is required. And agree how the team handles disclosure, escalation, feedback, and mistakes.

**Who it's for.** Founders, managers, team leads, transformation leaders, People leaders, and anyone working on a team where AI agents are starting to take on meaningful work. This is not a tool demo or a prompt-writing class. It's about how the team works when both people and agents are involved.

**What you leave with.** A one-page Human-Agent Team Agreement. Clearer decision rights and human boundaries. A simple review practice the team can repeat as the technology and the work change.

**What to bring.** One real workflow where people and AI agents already work together, or soon will.

{FACILITATOR} Also runs inside companies as a half-day session: https://insightsout.work/workshops/when-agents-join-the-team
"""


def call(method, path, key, body=None, query=""):
    req = urllib.request.Request(
        f"{BASE}/{path}{query}",
        data=json.dumps(body).encode() if body is not None else None,
        method=method,
        headers={"x-luma-api-key": key, "User-Agent": UA, "Accept": "application/json",
                 "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"{method} {path} -> HTTP {e.code}: {e.read().decode()[:400]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="write changes (default is a dry run)")
    ap.add_argument("--print-agents-copy", action="store_true",
                    help="print the When Agents Join the Team description to paste into a new event")
    args = ap.parse_args()
    if args.print_agents_copy:
        print(AGENTS_COPY)
        return

    key = os.environ.get("LUMA_API_KEY")
    if not key:
        sys.exit("LUMA_API_KEY not set.")

    entries = call("GET", "calendar/list-events", key, query="?pagination_limit=50")["entries"]
    planned = []
    for e in entries:
        ev = e.get("event", e)
        name = (ev.get("name") or "").strip()
        low = name.lower()
        eid = ev.get("api_id") or ev.get("id")
        hit = next((k for k, c in COPY.items() if any(m in low for m in c["match"])), None)
        if not hit:
            print(f"  leave   {ev.get('start_at', '')[:10]}  {name}")
            continue
        c = COPY[hit]
        body = {"event_api_id": eid}
        if c.get("name") and c["name"] != name:
            body["name"] = c["name"]
        if c.get("description_md"):
            body["description_md"] = c["description_md"]
        if c.get("prepend_md"):
            current = ev.get("description_md") or ev.get("description") or ""
            if c["prepend_md"].strip() in current:
                print(f"  ok      {ev.get('start_at', '')[:10]}  {name} (note already present)")
                continue
            body["description_md"] = c["prepend_md"] + current
        planned.append((name, ev.get("start_at", ""), body))

    for name, start, body in planned:
        changes = ", ".join(k for k in body if k != "event_api_id")
        print(f"  update  {start[:10]}  {name}  ->  {changes}" + (f"  (rename to: {body['name']})" if "name" in body else ""))

    if not args.apply:
        print("\nDry run. Re-run with --apply to write these changes.")
        return
    for name, start, body in planned:
        res = call("POST", "event/update", key, body=body)
        print(f"  wrote   {name}: {json.dumps(res)[:120]}")
    print("\nDone. Then create 'When Agents Join the Team' by hand (run with --print-agents-copy for the text)"
          " and send Claude the Oct 13 and new-event URLs for the site.")


if __name__ == "__main__":
    main()
