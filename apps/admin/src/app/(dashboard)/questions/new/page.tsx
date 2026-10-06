"use client";

import { PageHeader } from "@/components/admin";
import { QuestionEditor } from "@/components/question-editor";

export default function NewQuestion() {
  return (
    <>
      <PageHeader title="New question" description="Write it, check the preview, save as draft or send to review." />
      <QuestionEditor />
    </>
  );
}
