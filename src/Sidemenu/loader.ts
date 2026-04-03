// src/Sidemenu/loader.ts
// Server-side utilities for loading country-specific JSON files
import path from "path";
import { promises as fs } from "fs";
import { getCountryFolder } from "./countryMap";

export function getMenuFilePath(countryCode: string): string {
  const folder = getCountryFolder(countryCode);
  return path.resolve(`src/Sidemenu/${folder}/sidebar_menu.json`);
}

export function getAccessControlFilePath(countryCode: string): string {
  const folder = getCountryFolder(countryCode);
  return path.resolve(`src/Sidemenu/${folder}/access_control.json`);
}

export function getAccessActionFilePath(countryCode: string): string {
  const folder = getCountryFolder(countryCode);
  return path.resolve(`src/Sidemenu/${folder}/access_action.json`);
}

export async function loadSidebarMenu(countryCode: string) {
  const filePath = getMenuFilePath(countryCode);
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content);
}

export async function loadAccessControl(countryCode: string) {
  const filePath = getAccessControlFilePath(countryCode);
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content);
}

export async function loadAccessAction(countryCode: string) {
  const filePath = getAccessActionFilePath(countryCode);
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content);
}
