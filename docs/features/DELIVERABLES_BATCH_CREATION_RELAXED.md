# Relaxed Batch Deliverables Creation

This feature allows you to create multiple deliverables at once from JSON data with minimal validation requirements, perfect for LLM-generated content that needs post-creation refinement.

## Overview

The relaxed batch creation feature provides:

- **Minimal validation**: Only `title` is required
- **Smart defaults**: Automatically fills in sensible defaults for missing fields
- **Post-creation editing**: Platform and editor assignments can be done later via the UI
- **LLM-friendly**: Designed for AI-generated JSON that may lack complete information

## API Endpoint

```
POST /api/cars/{carId}/deliverables/batch-relaxed
```

## Required Fields

- `title` (string) - Only required field

## Optional Fields with Defaults

All other fields are optional and will receive sensible defaults:

- `platform`: Defaults to "Other"
- `type`: Defaults to "Video"
- `status`: Defaults to "not_started"
- `editor`: Defaults to "Unassigned"
- `aspect_ratio`: Defaults to "16:9"
- `duration`: Defaults to 0
- `edit_deadline`: Defaults to 7 days from creation
- `release_date`: Defaults to 1 day after deadline
- `firebase_uid`: Uses system default
- `description`: Defaults to empty string
- `tags`: Defaults to empty array

## Example JSON

Here's an example of the JSON data that can be imported:

```json
[
  {
    "title": "Instagram Reel",
    "type": "video",
    "duration": 15,
    "aspect_ratio": "9:16",
    "edit_deadline": "2024-01-20T17:00:00.000Z",
    "release_date": "2024-01-22T12:00:00.000Z",
    "status": "not_started"
  },
  {
    "title": "Overall Recap of the Event (16×9)",
    "type": "video",
    "duration": null,
    "aspect_ratio": "16:9",
    "edit_deadline": null,
    "release_date": null,
    "status": "not_started"
  },
  {
    "title": "Event Recap Photo Gallery – Cars, People, Experience",
    "type": "photo",
    "duration": null,
    "aspect_ratio": null,
    "edit_deadline": null,
    "release_date": null,
    "status": "not_started"
  }
]
```

## How to Use

1. **Navigate to Deliverables Tab**: Go to any car's deliverables section
2. **Click JSON Button**: Look for the "JSON" button in the header
3. **Paste or Upload**: Either paste JSON directly or upload a `.json` file
4. **Submit**: The system will create deliverables with minimal validation
5. **Edit Later**: Use the deliverables UI to assign platforms, editors, and refine details

## Features

### Smart Default Generation

- **Edit Deadline**: If not provided, set to 7 days from creation
- **Release Date**: If not provided, set to 1 day after edit deadline
- **Platform**: If not provided, set to "Other" for later assignment
- **Type**: If not provided, set to "Video" as most common type

### Validation

- **Title Required**: Only field that must be present
- **Date Format**: If dates are provided, they must be valid ISO strings
- **Error Messages**: Clear feedback on what went wrong

### Post-Creation Workflow

1. Create deliverables from LLM-generated JSON
2. Use the deliverables table to:
   - Assign proper platforms
   - Set correct media types
   - Assign editors
   - Adjust deadlines and release dates
   - Add tags and descriptions

## Benefits

- **Speed**: Quickly import large lists of deliverables
- **Flexibility**: Minimal requirements allow for incomplete data
- **LLM Integration**: Perfect for AI-generated content planning
- **User-Friendly**: Clear error messages and sensible defaults
- **Workflow Support**: Designed for iterative refinement

## Comparison with Regular Batch Creation

| Feature               | Regular Batch                                      | Relaxed Batch                  |
| --------------------- | -------------------------------------------------- | ------------------------------ |
| Required Fields       | title, platform, type, edit_deadline, firebase_uid | title only                     |
| Use Case              | Complete, structured data                          | LLM-generated, incomplete data |
| Default Values        | Limited                                            | Extensive smart defaults       |
| Post-Creation Editing | Optional                                           | Expected workflow              |

This feature is perfect for content planning workflows where an LLM generates initial deliverable lists that need human refinement.
