import React, { useEffect, useState } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Button from "../components/Button.jsx";

const fetchSchema = async () => {
  const { data } = await axios.get("/api/form-schema");
  return data;
};

const submitForm = async (payload) => {
  const { data } = await axios.post("/api/submissions", payload);
  return data;
};

export default function FormPage({ onSuccess }) {
  const qc = useQueryClient();
  const {
    data: schema,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["form-schema"],
    queryFn: fetchSchema,
  });

  const mutation = useMutation({
    mutationFn: submitForm,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submissions"] });
      if (onSuccess) onSuccess();
    },
  });

  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (schema) {
      const init = {};
      schema.fields.forEach((f) => {
        init[f.name] =
          f.type === "multi-select" ? [] : f.type === "switch" ? false : "";
      });
      setForm(init);
    }
  }, [schema]);

  if (isLoading) return <div>Loading schema...</div>;
  if (isError) return <div>Error loading schema.</div>;

  function handleChange(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function validate() {
    const errs = {};
    for (const field of schema.fields) {
      const val = form[field.name];
      if (field.required) {
        if (
          val === "" ||
          val === null ||
          val === undefined ||
          (Array.isArray(val) && val.length === 0)
        ) {
          errs[field.name] = "Required";
          continue;
        }
      }
      if (val !== undefined && val !== "" && val !== null) {
        if (field.type === "text" || field.type === "textarea") {
          if (
            field.validation &&
            field.validation.minLength &&
            String(val).length < field.validation.minLength
          ) {
            errs[field.name] = "Too short";
          }
          if (
            field.validation &&
            field.validation.maxLength &&
            String(val).length > field.validation.maxLength
          ) {
            errs[field.name] = "Too long";
          }
        }
        if (field?.type === "number") {
          const n = Number(val);
          if (isNaN(n)) errs[field.name] = "Must be a number";
          else {
            if (
              field.validation &&
              field.validation.min !== undefined &&
              n < field.validation.min
            )
              errs[field.name] = `Min ${field.validation.min}`;
            if (
              field.validation &&
              field.validation.max !== undefined &&
              n > field.validation.max
            )
              errs[field.name] = `Max ${field.validation.max}`;
          }
        }
        if (field?.type === "multi-select") {
          if (
            field.validation &&
            field.validation.minSelected !== undefined &&
            val.length < field.validation.minSelected
          )
            errs[
              field.name
            ] = `Select at least ${field.validation.minSelected}`;
          if (
            field.validation &&
            field.validation.maxSelected !== undefined &&
            val.length > field.validation.maxSelected
          )
            errs[field.name] = `Select at most ${field.validation.maxSelected}`;
        }
        if (
          field.type === "date" &&
          field.validation &&
          field.validation.minDate
        ) {
          const d = new Date(val);
          const minD = new Date(field.validation.minDate);
          if (d < minD)
            errs[
              field.name
            ] = `Date must be on/after ${field.validation.minDate}`;
        }
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate(form);
  }

  return (
    <div className="max-w-2xl bg-white p-6 rounded shadow">
      <h2 className="text-xl font-semibold mb-2">{schema.title}</h2>
      <p className="text-sm text-gray-600 mb-4">{schema.description}</p>

      <form onSubmit={onSubmit} className="space-y-4">
        {schema?.fields?.map((field) => (
          <div key={field.name}>
            <label className="block font-medium mb-1">
              {field.label}
              {field.required && <span className="text-red-500"> *</span>}
            </label>

            {field?.type === "text" && (
              <input
                className="w-full border p-2"
                placeholder={field.placeholder}
                value={form[field.name] || ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
              />
            )}

            {field?.type === "number" && (
              <input
                type="number"
                className="w-full border p-2"
                placeholder={field.placeholder}
                value={form[field.name] || ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
              />
            )}

            {field?.type === "date" && (
              <input
                type="date"
                className="w-full border p-2"
                value={form[field.name] || ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
              />
            )}

            {field?.type === "select" && (
              <select
                className="w-full border p-2"
                value={form[field.name] || ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
              >
                <option value="">{field.placeholder || "Select"}</option>
                {field.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}

            {field?.type === "multi-select" && (
              <select
                multiple
                className="w-full border p-2"
                value={form[field.name] || []}
                onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions).map(
                    (x) => x.value
                  );
                  handleChange(field.name, opts);
                }}
              >
                {field?.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}

            {field?.type === "textarea" && (
              <textarea
                className="w-full border p-2"
                placeholder={field.placeholder}
                value={form[field.name] || ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
              />
            )}

            {field?.type === "switch" && (
              <label className="inline-flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={!!form[field.name]}
                  onChange={(e) => handleChange(field.name, e.target.checked)}
                />
                <span>{field.placeholder || ""}</span>
              </label>
            )}

            {errors[field.name] && (
              <div className="text-sm text-red-600 mt-1">
                {errors[field.name]}
              </div>
            )}
          </div>
        ))}

        <div>
          <Button
            type="submit"
            className="disabled:opacity-60"
            disabled={mutation.isLoading}
          >
            {mutation.isLoading ? "Submitting..." : "Submit"}
          </Button>
          {mutation.isError && (
            <div className="text-red-600 mt-2">
              Submission failed. Try again.
            </div>
          )}
          {mutation.isSuccess && (
            <div className="text-green-600 mt-2">Submitted successfully.</div>
          )}
        </div>
      </form>
    </div>
  );
}
