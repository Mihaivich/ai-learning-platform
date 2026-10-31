import type { ProjectView } from "@/lib/projects/runtime";
import { CAST_TONE, firstName, initials } from "./config";

export type Mail = {
  id: string;
  from: string;
  initials: string;
  tone: string;
  subject: string;
  body: string;
  /** In-game time shown in the list. */
  time: string;
  kind: "email" | "ticket";
};

type Sender = Pick<Mail, "from" | "initials" | "tone">;

/**
 * The inbox is the scenario's opening mail plus messages that follow from what
 * the learner did. Everything here comes from the public view, so nothing
 * hidden (variants, checklists) can leak through Mail.
 */
export function mailbox(view: ProjectView): Mail[] {
  const { client, assistant, words, followUps } = view.scenario;
  const clientFirst = firstName(client.name);
  const person = (name: string, kind: keyof typeof CAST_TONE): Sender => ({ from: name, initials: initials(name), tone: CAST_TONE[kind] });
  const fromClient = person(client.name, "client");
  const fromAssistant = person(assistant.name, "assistant");
  const report: Sender = { from: `${client.organisation} · two weeks later`, initials: initials(client.organisation), tone: "from-stone-500 to-stone-700" };

  // Opening mail: the sender's tone follows their place in the cast.
  const toneOf = (from: string) => {
    const sender = firstName(from.replace(/\(.*?\)/g, ""));
    const member = view.scenario.cast.find((item) => item.name.split(/[\s&]+/).includes(sender));
    return member ? CAST_TONE[member.kind] : "from-stone-400 to-stone-600";
  };
  const mails: Mail[] = view.inbox.map((message, index) => ({
    id: message.id,
    from: message.from,
    initials: initials(message.from),
    tone: toneOf(message.from),
    subject: message.subject,
    body: message.body,
    time: `Mon 08:${String(10 + index * 7).padStart(2, "0")}`,
    kind: message.kind,
  }));

  // Follow-ups to the first move. Scenarios may write their own; otherwise this wording fits any job.
  const follow = followUps ?? {
    call: { subject: `Re: ${view.inbox[0]?.subject ?? "Your email"}`, body: `Of course! I have a few minutes now. I'll ring you on Meet.\n\n${clientFirst}` },
    delegate: {
      subject: "Started on it",
      body: `I've started on what ${clientFirst} asked for in the first email, and filled in the details with my own assumptions. Two days of work so far.\n\n${assistant.name}`,
    },
    delegateCall: {
      subject: "Before you go further…",
      body: `${words.manager} says you've started on something. Before you go further, can we talk? I'll ring you on Meet.\n\n${clientFirst}`,
    },
    quote: { subject: "Re: Quote", body: `Thanks for the quote, but I'm honestly not sure what I'd be paying for. Can we talk first? I'll ring you on Meet.\n\n${clientFirst}` },
  };
  const chose = (id: string) => view.history.some((event) => event.choice === id);

  if (chose("call-grace")) {
    mails.push({ id: "grace-call", ...fromClient, ...follow.call, time: "Mon 09:02", kind: "email" });
  }
  if (chose("cody-starts")) {
    mails.push({ id: "cody-started", ...fromAssistant, ...follow.delegate, time: "Tue 17:40", kind: "email" });
    mails.push({ id: "grace-call", ...fromClient, ...follow.delegateCall, time: "Wed 09:05", kind: "email" });
  }
  if (chose("send-quote")) {
    mails.push({ id: "grace-call", ...fromClient, ...follow.quote, time: "Mon 11:20", kind: "email" });
  }
  if (view.work) {
    mails.push({
      id: "cody-pr",
      ...fromAssistant,
      subject: view.track === "engineering" ? `Pull request: ${view.work.prTitle}` : `Ready for review: ${view.work.prTitle}`,
      body: `${view.work.prSummary}\n\nOpen Review to see it.\n\n${assistant.name}`,
      time: `Day ${Math.max(1, view.meters.effort)}`,
      kind: "email",
    });
  }
  if (view.completion) {
    const thing = words.deliverable.replace(/^the /i, "");
    mails.push({
      id: "outcome",
      ...report,
      subject: view.completion.outcome === "success" ? `Two weeks on the ${thing}` : `About the ${thing}`,
      body: view.completion.summary,
      time: "Two weeks later",
      kind: "email",
    });
  }
  return mails.reverse();
}
