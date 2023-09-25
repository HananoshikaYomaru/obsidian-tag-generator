import {
	MarkdownView,
	Plugin,
	parseFrontMatterEntry,
	parseYaml,
} from "obsidian";
import { IgnoreTypes, ignoreListOfTypes } from "./utils/ignore-types";
import { matchTagRegex } from "./utils/regex";
import {
	getTagsFromGeneratedText,
	breakdownTag,
	createNewText,
	writeFile,
} from "./getTagsFromGeneratedText";
import { getYAMLText, getYamlSectionValue, hasYaml } from "./utils/yaml";

enum YamlKey {
	IGNORE = "tag-gen-ignore",
}

export default class MyPlugin extends Plugin {
	async onload() {
		const saveCommandDefinition =
			this.app.commands.commands["editor:save-file"];
		const save = saveCommandDefinition.callback;

		if (typeof save === "function") {
			saveCommandDefinition.callback = () => {
				// get the tags of the current file
				const editor =
					this.app.workspace.getActiveViewOfType(
						MarkdownView
					)?.editor;

				if (editor) {
					const oldText = editor.getValue();
					const yaml = getYAMLText(oldText);

					if (
						yaml &&
						// getYamlSectionValue(yaml, YamlKey.IGNORE) === "true"
						parseYaml(yaml)[YamlKey.IGNORE]
					) {
						return;
					}

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
						.sort();

					if (newGeneratedTags.length === 0) {
						return;
					}

					const newText = createNewText(oldText, newGeneratedTags);
					writeFile(editor, oldText, newText);
				}
			};
		}
	}

	onunload() {}
}
