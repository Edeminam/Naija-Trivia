import { render, screen, fireEvent, act } from "@testing-library/react-native";

/** Activate a control the way TalkBack/VoiceOver do (PressableScale routes this to onPress). */
const activate = (el: any) => fireEvent(el, "accessibilityAction", { nativeEvent: { actionName: "activate" } });
import { AnswerButton } from "../ui/AnswerButton";
import { Button } from "../ui/Button";
import { CircularTimer } from "../ui/CircularTimer";
import { toE164 } from "../features/phone";

describe("AnswerButton", () => {
  it("is tappable when idle and announces the option", async () => {
    const onPress = jest.fn();
    await render(<AnswerButton letter="A" text="2Baba" state="idle" onPress={onPress} />);
    const btn = screen.getByRole("button", { name: "Option A: 2Baba" });
    await activate(btn);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not respond once answered and labels correct/wrong without relying on colour", async () => {
    const onPress = jest.fn();
    const { rerender } = await render(<AnswerButton letter="B" text="D'banj" state="wrong" mine onPress={onPress} />);
    const wrong = screen.getByLabelText("Option B: D'banj, wrong, your pick");
    await activate(wrong);
    expect(onPress).not.toHaveBeenCalled();
    await rerender(<AnswerButton letter="A" text="2Baba" state="correct" />);
    expect(screen.getByLabelText("Option A: 2Baba, correct answer")).toBeTruthy();
  });

  it("hides options removed by 50/50", async () => {
    await render(<AnswerButton letter="C" text="Wande Coal" state="idle" hidden />);
    expect(screen.getByLabelText("Option C removed")).toBeTruthy();
    expect(screen.queryByText("Wande Coal")).toBeNull();
  });
});

describe("Button", () => {
  it("fires onPress and blocks presses while loading", async () => {
    const onPress = jest.fn();
    const { rerender } = await render(<Button label="Play Clash" onPress={onPress} />);
    await activate(screen.getByRole("button", { name: "Play Clash" }));
    expect(onPress).toHaveBeenCalledTimes(1);
    await rerender(<Button label="Play Clash" onPress={onPress} loading />);
    await activate(screen.getByRole("button", { name: "Play Clash" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe("CircularTimer", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  it("counts down from the deadline and calls onExpire", async () => {
    const onExpire = jest.fn();
    const now = Date.now();
    await render(<CircularTimer deadline={now + 3000} duration={10000} onExpire={onExpire} />);
    expect(screen.getByLabelText("3 seconds left")).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(3200);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });
});

describe("toE164", () => {
  it("normalises Nigerian numbers to +234", () => {
    expect(toE164("08031234567")).toBe("+2348031234567");
    expect(toE164("803 123 4567")).toBe("+2348031234567");
    expect(toE164("+234 803 123 4567")).toBe("+2348031234567");
    expect(toE164("2349061234567")).toBe("+2349061234567");
    expect(toE164("12345")).toBeNull();
    expect(toE164("06031234567")).toBeNull();
  });
});
