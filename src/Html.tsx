import React from 'react';

function Html({
	updatedScenarioName,
	uiPath,
	scenarios,
}: {
	uiPath: string;
	scenarios: Array<{ id: string; name: string; selected: boolean }>;
	updatedScenarioName?: string;
}) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				<title>
					{updatedScenarioName ? 'Updated - ' : ''}Scenarios - Scenario Mock
					Server
				</title>
				<link
					rel="stylesheet"
					href={`${uiPath}${uiPath.slice(-1) === '/' ? '' : '/'}index.css`}
				/>
			</head>
			<body>
				<main>
					<ScenarioUpdateInfo updatedScenarioName={updatedScenarioName} />
					<form className="stack-1" method="POST" action={uiPath}>
						<p>
							<a href={uiPath}>Refresh page</a>
						</p>
						<CallToActionButton />
						<fieldset className="stack-3">
							<legend>
								<h1>Scenarios</h1>
							</legend>
							<div className="stack-3">
								{scenarios.map((scenario) => (
									<div key={scenario.id}>
										<input
											type="radio"
											id={scenario.id}
											name="scenarioId"
											value={scenario.id}
											defaultChecked={scenario.selected}
										/>
										<label htmlFor={scenario.id}>{scenario.name}</label>
									</div>
								))}
							</div>
						</fieldset>
						<CallToActionButton />
					</form>
				</main>
			</body>
		</html>
	);
}

function ScenarioUpdateInfo({
	updatedScenarioName,
}: {
	updatedScenarioName?: string;
}) {
	if (!updatedScenarioName) {
		return null;
	}

	return <>Updated to the following scenario: {updatedScenarioName}</>;
}

function CallToActionButton() {
	return (
		<div className="button-group">
			<button type="submit" name="button" value="modify">
				Select scenario
			</button>
		</div>
	);
}

export { Html };
