import { EventRef, MarkdownView, Plugin, parseYaml } from "obsidian";
import { IgnoreTypes, ignoreListOfTypes } from "./utils/ignore-types";
import { matchTagRegex } from "./utils/regex";
import {
	getTagsFromGeneratedText,
	breakdownTag,
	createNewText,
	writeFile,
} from "./getTagsFromGeneratedText";
import { getYAMLText } from "./utils/yaml";

enum YamlKey {
	IGNORE = "tag-gen-ignore",
}

export default class MyPlugin extends Plugin {
	private eventRefs: EventRef[] = [];
	private previousSaveCommand: () => void;

	registerEventsAndSaveCallback() {
		const saveCommandDefinition =
			this.app.commands.commands["editor:save-file"];
		this.previousSaveCommand = saveCommandDefinition.callback;

		if (typeof this.previousSaveCommand === "function") {
			saveCommandDefinition.callback = () => {
				// run the previous save command
				this.previousSaveCommand();
				// get the tags of the current file
				const editor =
					this.app.workspace.getActiveViewOfType(
						MarkdownView
					)?.editor;

				if (!editor) return;

				const oldText = editor.getValue();
				const yaml = getYAMLText(oldText);
				// if the YAML string exists
				if (!yaml) return;
				const yamlObj = parseYaml(yaml);
				// if the YAML is empty
				if (!yamlObj) return;
				// if the YAML has the ignore key
				if (yamlObj[YamlKey.IGNORE]) return;

				// recognise the pattern, and get all the generated tags
				const generatedTags = getTagsFromGeneratedText(oldText);

				// need to ignore YAML when getting regex matches to avoid improper matches with YAML contents
				// https://github.com/platers/obsidian-linter/issues/661
				const tags: string[] = [];
				ignoreListOfTypes([IgnoreTypes.yaml], oldText, (text) => {
					// get all the tags except the generated ones
					tags.push(
						...matchTagRegex(text).filter(
							(tag) => !generatedTags.includes(tag)
						)
					);

					return text;
				});

				// bread down the tag to its parents, #a/b/c -> #a #a/b
				const newGeneratedTags = tags
					.map(breakdownTag)
					.flat()
					// remove duplicate
					.filter((tag, index, self) => {
						return self.indexOf(tag) === index;
					})
					// if the tag is already in the file, remove it
					.filter((tag) => !tags.includes(tag))
					.sort();

				if (newGeneratedTags.length === 0) {
					return;
				}

				const newText = createNewText(oldText, newGeneratedTags);
				writeFile(editor, oldText, newText);

				// defines the vim command for saving a file and lets the linter run on save for it
				// accounts for https://github.com/platers/obsidian-linter/issues/19
				const that = this;
				window.CodeMirrorAdapter.commands.save = () => {
					that.app.commands.executeCommandById("editor:save-file");
				};
			};
		}
	}

	async onload() {
		this.registerEventsAndSaveCallback();
	}

	unregisterEventsAndSaveCallback() {
		const saveCommandDefinition =
			this.app.commands.commands["editor:save-file"];
		saveCommandDefinition.callback = this.previousSaveCommand;
	}

	onunload() {
		for (const eventRef of this.eventRefs) {
			this.app.workspace.offref(eventRef);
		}
		this.unregisterEventsAndSaveCallback();
	}
}
