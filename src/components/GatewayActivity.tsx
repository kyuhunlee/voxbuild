import { describeGatewayOutcome, type GatewayTrace } from "@/lib/gateway-telemetry";
import "./gateway-activity.css";

const unknown = "Not returned";

export default function GatewayActivity({ trace }: { trace: GatewayTrace }) {
  const outcome = describeGatewayOutcome(trace);
  const modelVendor = trace.executedModel?.includes("/") && !trace.executedModel.startsWith("vmc/") ? trace.executedModel.split("/")[0] : null;
  return <section className="gateway-trace" aria-label="Gateway routing for this request">
    <p className={`gateway-trace-badge${trace.routingTest ? " is-test" : ""}`}>{outcome.title}</p>
    <dl className="gateway-trace-facts">
      <div><dt>Requested primary</dt><dd>{trace.requestedModel ?? unknown}</dd></div>
      <div><dt>Configured fallback</dt><dd>{trace.configuredFallbackModels === null ? unknown : trace.configuredFallbackModels.length ? trace.configuredFallbackModels.join(" → ") : "None configured"}</dd></div>
      <div className="gateway-trace-executed"><dt>Executed model</dt><dd>{trace.executedModel ?? unknown}{modelVendor && <small>Model vendor: {modelVendor}</small>}</dd></div>
      <div className="gateway-trace-executed"><dt>Serving provider</dt><dd>{trace.executedProvider ?? unknown}</dd></div>
    </dl>
    <p className="gateway-trace-note">{outcome.note}</p>
    <div className="gateway-attempt-heading"><strong>Returned attempt sequence</strong><span>{trace.providerAttemptCount === null ? "Count not returned" : `${trace.providerAttemptCount} provider request${trace.providerAttemptCount === 1 ? "" : "s"}`}</span></div>
    {trace.modelAttempts?.length ? <ol className="gateway-attempts">{trace.modelAttempts.map((attempt, index) => <li key={index}>
      <div className="gateway-attempt-model"><span>{index + 1}</span><strong>{attempt.model ?? "Model not returned"}</strong></div>
      {attempt.providers?.length ? <ul>{attempt.providers.map((provider, index) => <li key={index}>
        <span>{provider.provider ?? "Provider not returned"}</span>
        <span className={provider.success === true ? "gateway-attempt-success" : provider.success === false ? "gateway-attempt-failure" : ""}>{provider.success === true ? "Succeeded" : provider.success === false ? "Failed" : "Status not returned"}{provider.statusCode !== null ? ` · ${provider.statusCode}` : ""}</span>
      </li>)}</ul> : <p>{attempt.providers === null ? "Provider attempts not returned" : "No provider request was made"}</p>}
    </li>)}</ol> : <p className="gateway-trace-note">Attempt details were not returned. Check AI Gateway Logs for more information.</p>}
  </section>;
}
