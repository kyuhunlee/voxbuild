import { ModelPlanSchema } from "../model-schema";
import { OperationsSchema, type Operation } from "../schema";
import { HttpError } from "./errors";

/** Provider output is a separate trust boundary from the user's HTTP request. */
export function parseGeneratedPlan(output: unknown): { message: string; operations: Operation[] } {
  const generated = ModelPlanSchema.safeParse(output);
  if (!generated.success) throw invalidModelOutput();
  const operations = generated.data.operations.length ? OperationsSchema.safeParse(generated.data.operations) : null;
  if (operations && !operations.success) throw invalidModelOutput();
  return { message: generated.data.message.slice(0, 400), operations: operations?.data ?? [] };
}

function invalidModelOutput() {
  return new HttpError(502, "The AI returned an unsupported edit, so nothing was saved. Try rephrasing your request.", "INVALID_MODEL_OUTPUT");
}
