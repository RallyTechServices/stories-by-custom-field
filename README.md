#Story Summary by Field

This app shows a summary of the all of the stories in scope that match a particular field value.  

The field to use for criteria is configured in the "Group Field" configuration of the App Settings.  
Any custom dropdown field, Iteration or Release can be used to group and summarize the stories.  

The summaries include the number and points for user story states and also the number and points for 
potential user story issues.  

Data set and summaries only include "leaf" stories, which are stories that do not have child stories.
  
If a PlanEstimate is explicity set to 0, then it will not be counted as an "unestimated" story.  

![ScreenShot](/images/stories-by-field.png)
