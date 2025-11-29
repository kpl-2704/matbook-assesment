"use strict";

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");
const { nanoid } = require("nanoid");
const path = require("path");
app.use(
  cors({
    origin: "*",
  })
);

const app = express();
app.use(cors());
app.use(bodyParser.json());

const file = path.join(__dirname, "db.json");
const adapter = new JSONFile(file);
const db = new Low(adapter, { submissions: [], schema: null });

const SCHEMA = {
  title: "Employee Onboarding",
  description: "Collect basic employee details for onboarding.",
  fields: [
    {
      name: "firstName",
      label: "First Name",
      type: "text",
      placeholder: "John",
      required: true,
      validation: { minLength: 2, maxLength: 50 },
    },
    {
      name: "lastName",
      label: "Last Name",
      type: "text",
      placeholder: "Doe",
      required: true,
      validation: { minLength: 2, maxLength: 50 },
    },
    {
      name: "age",
      label: "Age",
      type: "number",
      placeholder: "30",
      required: true,
      validation: { min: 18, max: 80 },
    },
    {
      name: "startDate",
      label: "Start Date",
      type: "date",
      placeholder: "",
      required: true,
      validation: { minDate: "2020-01-01" },
    },
    {
      name: "role",
      label: "Role",
      type: "select",
      placeholder: "Select role",
      required: true,
      options: ["Developer", "Designer", "Product", "HR"],
    },
    {
      name: "skills",
      label: "Skills",
      type: "multi-select",
      placeholder: "Select skills",
      required: false,
      options: ["React", "Node", "SQL", "Design", "Testing"],
      validation: { minSelected: 0, maxSelected: 5 },
    },
    {
      name: "bio",
      label: "Biography",
      type: "textarea",
      placeholder: "A short bio",
      required: false,
      validation: { maxLength: 500 },
    },
    {
      name: "remote",
      label: "Remote Worker",
      type: "switch",
      placeholder: "",
      required: false,
    },
  ],
};

async function initDB() {
  await db.read();
  db.data = db.data || { submissions: [], schema: null };
  if (!db.data.schema) {
    db.data.schema = SCHEMA;
    await db.write();
  }
}
initDB();

function validateAgainstSchema(schema, payload) {
  const errors = {};
  for (const field of schema.fields) {
    const val = payload[field.name];
    if (
      field.required &&
      (val === undefined ||
        val === null ||
        val === "" ||
        (Array.isArray(val) && val.length === 0))
    ) {
      errors[field.name] = "This field is required.";
      continue;
    }
    if (val !== undefined && val !== null && val !== "") {
      if (field.type === "text" || field.type === "textarea") {
        if (
          field.validation &&
          field.validation.minLength &&
          String(val).length < field.validation.minLength
        ) {
          errors[
            field.name
          ] = `Minimum length is ${field.validation.minLength}`;
        }
        if (
          field.validation &&
          field.validation.maxLength &&
          String(val).length > field.validation.maxLength
        ) {
          errors[
            field.name
          ] = `Maximum length is ${field.validation.maxLength}`;
        }
        if (field.validation && field.validation.regex) {
          const re = new RegExp(field.validation.regex);
          if (!re.test(String(val))) {
            errors[field.name] = `Invalid format.`;
          }
        }
      }
      if (field.type === "number") {
        const num = Number(val);
        if (isNaN(num)) {
          errors[field.name] = "Must be a number.";
        } else {
          if (
            field.validation &&
            field.validation.min !== undefined &&
            num < field.validation.min
          ) {
            errors[field.name] = `Minimum value is ${field.validation.min}`;
          }
          if (
            field.validation &&
            field.validation.max !== undefined &&
            num > field.validation.max
          ) {
            errors[field.name] = `Maximum value is ${field.validation.max}`;
          }
        }
      }
      if (field.type === "multi-select") {
        if (!Array.isArray(val)) {
          errors[field.name] = "Must be an array.";
        } else {
          if (
            field.validation &&
            field.validation.minSelected !== undefined &&
            val.length < field.validation.minSelected
          ) {
            errors[
              field.name
            ] = `Select at least ${field.validation.minSelected} items.`;
          }
          if (
            field.validation &&
            field.validation.maxSelected !== undefined &&
            val.length > field.validation.maxSelected
          ) {
            errors[
              field.name
            ] = `Select at most ${field.validation.maxSelected} items.`;
          }
        }
      }
      if (field.type === "date") {
        const dateVal = new Date(val);
        if (isNaN(dateVal.getTime())) {
          errors[field.name] = "Invalid date.";
        } else {
          if (field.validation && field.validation.minDate) {
            const minD = new Date(field.validation.minDate);
            if (dateVal < minD) {
              errors[
                field.name
              ] = `Date must be on/after ${field.validation.minDate}`;
            }
          }
        }
      }
    }
  }
  return errors;
}

// GET Api form schema to fetch and render form
app.get("/api/form-schema", async (req, res) => {
  await db.read();
  return res.json(db.data.schema);
});

// POST submission with validation against schema
app.post("/api/submissions", async (req, res) => {
  await db.read();
  const payload = req.body;
  const schema = db.data.schema;

  const errors = validateAgainstSchema(schema, payload);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const id = nanoid();
  const createdAt = new Date().toISOString();
  const record = { id, createdAt, data: payload };
  db.data.submissions.unshift(record);
  await db.write();

  return res.status(201).json({ success: true, id, createdAt });
});

// GET submissions with pagination & sorting
app.get("/api/submissions", async (req, res) => {
  await db.read();
  let {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  if (limit > 100) limit = 100;
  const items = db.data.submissions.slice();

  if (sortBy === "createdAt") {
    items.sort((a, b) => {
      if (sortOrder === "asc")
        return new Date(a.createdAt) - new Date(b.createdAt);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const pageItems = items.slice(start, start + limit);

  return res.json({
    success: true,
    page,
    limit,
    total,
    totalPages,
    items: pageItems,
  });
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
