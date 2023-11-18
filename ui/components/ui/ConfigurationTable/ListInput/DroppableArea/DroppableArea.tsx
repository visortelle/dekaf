import { DragEndEvent, useDndMonitor, useDroppable } from "@dnd-kit/core";
import React from "react";
import { v4 as uuid } from "uuid";
import s from "./NewQuestionDroppableArea.module.css";
import { faker } from "@faker-js/faker";

export type Position =
  | { type: "section-end"; sectionId: string }
  | { type: "before-question"; sectionId: string; questionId: string };

export type OnQuestionAddedProps = {
  position: Position;
};

type NewQuestionDroppableAreaProps = {
  id: string;
  position: Position;
  onChange: ({ position }: OnQuestionAddedProps) => void;
};
const NewQuestionDroppableArea: React.FC<NewQuestionDroppableAreaProps> = (props) => {
  const id = `new-question-droppable-area__${props.id}`;
  const { setNodeRef, over } = useDroppable({ id: props.id, data: { id } });
  const [isVisible, setIsVisible] = React.useState(false);
  const isOver = over?.data.current?.id === id;

  useDndMonitor({
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
  });

  function handleDragStart(event: DragEndEvent) {
    if ((event.active.data.current as DndData).type !== "drop-new-field") {
      return;
    }

    setIsVisible(true);
  }

  function handleDragEnd(event: DragEndEvent) {
    if ((event.active.data.current as DndData).type !== "drop-new-field") {
      return;
    }

    setIsVisible(false);

    if (!isOver) {
      return;
    }

    const questionId = uuidv7();

    const newQuestion: QuestionDescriptor<KnownFieldDescriptor> = {
      id: questionId,
      title: `<h2>New Question</h2>`,
      descriptionHtml: faker.lorem.paragraphs(2),
      field: {
        type: "formatted-text",
        isRequired: false,
        config: { isSingleLine: false, placeholder: "Your answer" },
        validationRules: [],
        initialValue: { type: "formatted-text", value: { html: "" } },
      },
    };

    props.onChange({ position: props.position, question: newQuestion });
  }

  return <div ref={setNodeRef} className={`${s.Area} ${isOver ? s.Over : ""} ${isVisible ? s.Visible : ""}`}></div>;
};

export default NewQuestionDroppableArea;
