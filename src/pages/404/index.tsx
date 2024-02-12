import { useRouteError } from "react-router-dom";
import { Link } from "react-router-dom";
import "./index.scss";

const pageNotFoundMessages = [
  "Page went on vacation and forgot to leave a note.",
  "Page is currently on a digital detox in the cloud.",
  "Page took a detour to the information superhighway rest stop.",
  "Page is playing hide and seek with the server. We're still counting.",
  "Page joined a band. It's currently on a world tour of the internet.",
  "Page got a virtual tan and is taking a break from the spotlight.",
  "Page tried to become a stand-up comedian, but the server didn't get the joke.",
  "Page is in a parallel universe, searching for a parallel hyperlink.",
  "Page got caught in a time warp. It should be back from the '90s soon.",
  "Page is attending a digital costume party as a 403 Forbidden. Incognito mode activated.",
  "Page is doing a PhD in binary code. We're waiting for its thesis defense.",
  "Page is at the spa, getting a byte-sized massage for relaxation.",
  "Page decided to become a cyber-sleuth and is currently on a case.",
  "Page got stuck in a virtual traffic jam. We've dispatched a digital tow truck.",
  "Page is taking a selfie with the pixels. We'll get it back when it's done posing.",
  "Page is on a quest to find the holy grail of URLs. We wish it luck.",
  "Page is training for the virtual Olympics. The 404-meter hurdles are quite challenging.",
  "Page enrolled in a coding bootcamp. We hope it graduates with flying colors.",
  "Page is participating in a virtual reality flash mob. Join the dance if you find it!",
  "Page is writing its autobiography in binary. It's a best-seller in the digital library.",
];

function getRandomMessage() {
  return pageNotFoundMessages[
    Math.floor(Math.random() * (pageNotFoundMessages.length - 1))
  ];
}

export default function ErrorPage() {
  const error = useRouteError() as Error;

  console.error(error);

  return (
    <main>
      <div className="router-page error">
        {"status" in error && error.status === 404 ? (
          <>
            <h1>404 Not Found</h1>
            <p>{getRandomMessage()}</p>
          </>
        ) : (
          <>
            <h1>An error occoured.</h1>
            <p>
              An unexpected error occoured.
              {"statusText" in error
                ? (error.statusText as string)
                : "message" in error
                ? (error.message as string)
                : "Unknown."}
            </p>
          </>
        )}
        <Link to="/">Return to the homepage.</Link>
      </div>
    </main>
  );
}
