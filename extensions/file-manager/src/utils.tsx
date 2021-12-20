// xxxx
import { ActionPanel, CopyToClipboardAction, List, ShowInFinderAction, OpenWithAction, OpenAction, showToast, ToastStyle, getPreferenceValues, PushAction, Icon, Detail, ActionPanelItem } from "@raycast/api";
import { promisify } from "node:util";
import { exec as _exec } from "node:child_process";
import filesize from "filesize";
import { existsSync, lstatSync, readdirSync, readlinkSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { useEffect, useState } from "react";
const moment = require('moment')
const exec = promisify(_exec);

export type FileType = "directory" | "file" | "symlink" | "other";

export type FileDataType = {
	type: FileType;
	name: string;
	size: number;
	permissions: string;
	path: string;
	date: Date;
}

export type PreferencesType = {
	showDots: boolean;
	directoriesFirst: boolean;
	caseSensitive: boolean;
	showFilePermissions: boolean;
	showFileSize: boolean;
	startDirectory: string,
}

export async function runShellScript(command: string) {
	const { stdout, stderr } = await exec(command);
	return { stdout, stderr };
}

export function getStartDirectory(): string {
	let { startDirectory } = getPreferenceValues();
	startDirectory = startDirectory.replace("~", homedir());
	return resolve(startDirectory);
}

export function SymlinkItem(props: any) {
	const preferences: PreferencesType = getPreferenceValues();
	const filePath = `${props.fileData.path}/${props.fileData.name}`;
	const a = readlinkSync(filePath);
	const originalPath = a.startsWith("/") ? a : `${props.fileData.path}/${a}`;
	const originalFileData = lstatSync(originalPath);
	if (originalFileData.isDirectory()) {
		return (
			<List.Item
				id={filePath}
				title={props.fileData.name}
				icon={{ fileIcon: filePath }}
				subtitle={preferences.showFilePermissions ? props.fileData.permissions : ""}
				actions={
					<ActionPanel>
						<PushAction title="Open Symlink Directory" icon={Icon.ArrowRight} target={<Directory path={originalPath} />} />
						<OpenWithAction path={filePath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
						<CopyToClipboardAction title="Copy Symlink Path" content={filePath} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
						<CopyToClipboardAction title="Copy Original Directory Path" content={filePath} shortcut={{ modifiers: ["cmd", "opt"], key: "c" }} />
						{SortToggle(props)}
					</ActionPanel>
				}
			/>
		);
	} else {
		return (
			<List.Item
				id={filePath}
				title={props.fileData.name}
				icon={{ fileIcon: filePath }}
				subtitle={preferences.showFilePermissions ? props.fileData.permissions : ""}
				actions={
					<ActionPanel>
						<OpenAction title="Open File" target={originalPath} />
						<OpenWithAction path={filePath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
						<CopyToClipboardAction title="Copy Symlink Path" content={filePath} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
						<CopyToClipboardAction title="Copy Original File Path" content={originalPath} shortcut={{ modifiers: ["cmd", "opt"], key: "c" }} />
						{SortToggle(props)}
					</ActionPanel>
				}
			/>
		);
	}
}

export function FileItem(props: any) {
	const preferences: PreferencesType = getPreferenceValues();
	const filePath = `${props.fileData.path}/${props.fileData.name}`;
	return (
		<List.Item
			key={filePath}
			id={filePath}
			title={props.fileData.name}
			icon={{ fileIcon: filePath }}
			// subtitle={preferences.showFilePermissions ? props.fileData.permissions : ""}
			subtitle={`${moment(props.fileData.date).fromNow()}`}
			accessoryTitle={`${preferences.showFileSize ? filesize(props.fileData.size, { round: 0, roundingMethod: "floor", spacer: "" }) : ""} ${formatDate(props)}`}
			// accessoryTitle={preferences.showFileSize ? filesize(props.fileData.size, { round: 0, roundingMethod: "floor", spacer: "" }) : ""}
			actions={
				<ActionPanel>
					<OpenAction title="Open File" target={filePath} />
					<ShowInFinderAction path={filePath} />
					<OpenWithAction path={filePath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
					<CopyToClipboardAction title="Copy File Path" content={filePath} shortcut={{ modifiers: ["opt", "shift"], key: "c" }} />
					{SortToggle(props.sortToggle)}
				</ActionPanel>
			}
		/>
	);
}

export function DirectoryItem(props: any) {
	const preferences: PreferencesType = getPreferenceValues();
	const filePath = `${props.fileData.path}/${props.fileData.name}`;
	return (
		<List.Item
			id={filePath}
			title={props.fileData.name}
			// subtitle={preferences.showFilePermissions ? props.fileData.permissions : ""}
			subtitle={`${moment(props.fileData.date).fromNow()}`}
			icon={{ fileIcon: filePath }}
			accessoryTitle={`${formatDate(props)}`}
			actions={
				<ActionPanel>
					<PushAction title="Open Directory" icon={Icon.ArrowRight} target={<Directory path={filePath} sortByDate={props.sortByDate} />} />
					<ShowInFinderAction path={filePath} />
					<CopyToClipboardAction title="Copy Directory Path" content={`${filePath}/`} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
					{SortToggle(props.sortToggle)}
				</ActionPanel>
			}
		/>
	);
}

function formatDate(props: any) {
	return moment(props.fileData.date).format('YYYY-MM-DD HH:mm').replace(`${moment().year()}-`,'');
}

export function SortToggle(sortToggle: Function) {
	return <ActionPanel.Item title='Toggle'
		shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
		onAction={() => sortToggle()} />;
}

export function createItem(fileData: FileDataType, sortToggle: Function, sortByDate: Boolean) {
	const filePath = `${fileData.path}/${fileData.name}`;
	if (fileData.type === "directory") {
		return (<DirectoryItem fileData={fileData} key={filePath} sortToggle={sortToggle} sortByDate={sortByDate} />);
	} else if (fileData.type === "file") {
		return (<FileItem fileData={fileData} key={filePath} sortToggle={sortToggle} sortByDate={sortByDate} />);
	} else if (fileData.type === "symlink") {
		return (<SymlinkItem fileData={fileData} key={filePath} sortToggle={sortToggle} sortByDate={sortByDate} />);
	} else {
		showToast(ToastStyle.Failure, "Unsupported file type", `File type: ${fileData.type}`);
	}
}

export function getDirectoryData(path: string): FileDataType[] {
	const preferences: PreferencesType = getPreferenceValues();
	let files: string[] = readdirSync(path);
	if (!preferences.showDots) {
		files = files.filter((file) => !file.startsWith("."));
	}
	if (!preferences.caseSensitive) {
		files = files.sort((a: string, b: string) => {
			if (a.toLowerCase() < b.toLowerCase()) return -1;
			if (a.toLowerCase() > b.toLowerCase()) return 1;
			else return 0;
		});
	}

	const data: FileDataType[] = [];

	for (const file of files) {
		const fileData = lstatSync(`${path}/${file}`);
		let fileType: FileType = "other";
		if (fileData.isDirectory()) fileType = "directory";
		if (fileData.isFile()) fileType = "file";
		if (fileData.isSymbolicLink()) fileType = "symlink";

		const permissions: string = (fileData.mode & parseInt("777", 8)).toString(8); // convert from number to octal
		const size: number = fileData.size;

		const d: FileDataType = {
			type: fileType,
			name: file,
			size: size,
			permissions: permissions,
			path: path,
			date: fileData.mtime
		}
		data.push(d);
	}

	return data;
}

export function Directory(props: { path: string, sortByDate: Boolean }) {
	const [sortByDate, setSortByDate] = useState(props.sortByDate);
	const sortToggle = () => setSortByDate(!sortByDate)

	// useEffect(() => { }, []);

	if (!existsSync(props.path)) {
		return <Detail markdown={`# Error: \n\nThe directory \`${props.path}\` does not exist. `} />;
	}
	const directoryData = getDirectoryData(props.path);
	if (sortByDate) {
		directoryData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
	}
	const preferences: PreferencesType = getPreferenceValues();
	if (preferences.directoriesFirst) {
		const directories = directoryData.filter(file => file.type === "directory");
		const nonDirectories = directoryData.filter(file => file.type !== "directory");
		return (
			<List
				searchBarPlaceholder={`Search in ${props.path}/`}
			// navigationTitle={`by ${sortByDate ? 'date' : 'name'}`}
			>
				<List.Section title="Directories" subtitle={`by ${sortByDate ? 'Date' : 'Name'}`}>
					{directories.map(data => createItem(data, sortToggle, sortByDate))}
				</List.Section>
				<List.Section title="Files" subtitle={`by ${sortByDate ? 'Date' : 'Name'}`}>
					{nonDirectories.map(data => createItem(data, sortToggle, sortByDate))}
				</List.Section>
			</List>
		);
	} else {
		return (
			<List searchBarPlaceholder={`Search in ${props.path}/`}>
				{directoryData.map(data => createItem(data, sortToggle, sortByDate))}
			</List>
		);
	}
}
