'use client';
import React, { useState } from "react";

const RulesForm: React.FC = () => {
  const [dropdown1, setDropdown1] = useState("");
  const [dropdown2, setDropdown2] = useState("");
  const [dropdown3, setDropdown3] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log("Dropdown 1:", dropdown1);
    console.log("Dropdown 2:", dropdown2);
    console.log("Dropdown 3:", dropdown3);
    console.log("Message:", message);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded-sm shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label htmlFor="dropdown1" className="block mb-2 font-semibold">
            Dropdown 1
          </label>
          <select
            id="dropdown1"
            value={dropdown1}
            onChange={(e) => setDropdown1(e.target.value)}
            className="w-full p-2 border rounded-sm"
          >
            <option value="">Select an option</option>
            <option value="option1">Option 1</option>
            <option value="option2">Option 2</option>
            <option value="option3">Option 3</option>
          </select>
        </div>
        <div>
          <label htmlFor="dropdown2" className="block mb-2 font-semibold">
            Dropdown 2
          </label>
          <select
            id="dropdown2"
            value={dropdown2}
            onChange={(e) => setDropdown2(e.target.value)}
            className="w-full p-2 border rounded-sm"
          >
            <option value="">Select an option</option>
            <option value="option1">Option 1</option>
            <option value="option2">Option 2</option>
            <option value="option3">Option 3</option>
          </select>
        </div>
        <div>
          <label htmlFor="dropdown3" className="block mb-2 font-semibold">
            Dropdown 3
          </label>
          <select
            id="dropdown3"
            value={dropdown3}
            onChange={(e) => setDropdown3(e.target.value)}
            className="w-full p-2 border rounded-sm"
          >
            <option value="">Select an option</option>
            <option value="option1">Option 1</option>
            <option value="option2">Option 2</option>
            <option value="option3">Option 3</option>
          </select>
        </div>
      </div>
      <div className="mb-4">
        <label htmlFor="message" className="block mb-2 font-semibold">
          Message
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full p-2 border rounded-sm"
          rows={4}
        />
      </div>
      <button
        type="submit"
        className="px-4 py-2 bg-blue-500 text-white rounded-sm hover:bg-blue-600"
      >
        Submit
      </button>
    </form>
  );
};

export default RulesForm;