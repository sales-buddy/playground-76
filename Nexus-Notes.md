=====================================================================
The rephrase_agent generates alternate phrasings of the user query to improve retrieval and planning quality.
The orchestrator compares the rephrased queries using a cosine similarity calculation and picks the best candidate query.
The selected query is sent to the planner_agent, which creates an ordered execution plan with the tasks needed to satisfy the user’s goal.
The orchestrator runs those tasks step by step, shares context between agents, and continues until the workflow is completed or blocked.


============================================================
Simple leadership bullets:

The system first rewrites the user request into clearer alternate phrasings to improve understanding.
It selects the strongest query variation and sends it to the planner agent.
The planner agent creates an ordered set of steps using the right specialist agents for the goal.
The orchestrator executes each step, passes context forward, and drives the workflow until the task is completed.

<img width="1838" height="1018" alt="image" src="https://github.com/user-attachments/assets/92ffa883-b90a-433a-869b-871a915abc47" />
