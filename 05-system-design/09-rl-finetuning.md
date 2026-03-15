# RL Finetuning + Evals - Model Training Project Plan

## 1. Project Overview

A comprehensive project for fine-tuning language models using modern techniques (SFT, DPO, RLHF) and building robust evaluation frameworks. You'll learn how to adapt pre-trained models to specific tasks, collect preference data, train reward models, and measure model performance systematically. This is essential knowledge for anyone working with LLMs in production.

### Core Value Proposition
- Fine-tune models for specific use cases (coding, customer support, creative writing)
- Build evaluation pipelines to measure model quality
- Understand the full training pipeline from data to deployment
- Create preference datasets for alignment training

### Key Learning Outcomes
- Dataset preparation and formatting for LLM training
- Supervised Fine-Tuning (SFT) implementation
- Direct Preference Optimization (DPO) training
- Reward model training for RLHF
- Evaluation framework design
- Training infrastructure (distributed training, checkpointing)
- LoRA/QLoRA for efficient fine-tuning

---

## 2. Features & Requirements

### MVP (Must-Have)
- [ ] Dataset loading and preprocessing pipeline
- [ ] SFT training loop with LoRA
- [ ] Training dashboard (W&B integration)
- [ ] Basic eval suite (perplexity, accuracy, pass@k)
- [ ] Model checkpointing and resumption
- [ ] Inference script for trained models
- [ ] Support for Llama, Mistral, Qwen models

### V2 Features (Nice-to-Have)
- [ ] DPO training implementation
- [ ] Preference data collection UI
- [ ] Reward model training
- [ ] RLHF with PPO
- [ ] Model-graded evaluations (LLM-as-judge)
- [ ] Human preference evaluation pipeline
- [ ] A/B testing framework
- [ ] Automated hyperparameter tuning
- [ ] Multi-GPU distributed training
- [ ] GGUF/ONNX export for deployment

---

## 3. Tech Stack

### Core ML
| Technology | Purpose |
|------------|---------|
| Python 3.11+ | Primary language |
| PyTorch 2.x | Deep learning framework |
| Transformers | Model loading, tokenization |
| TRL | SFT, DPO, PPO trainers |
| PEFT | LoRA, QLoRA adapters |
| Accelerate | Distributed training |

### Data & Eval
| Technology | Purpose |
|------------|---------|
| Datasets | HuggingFace dataset handling |
| pandas | Data manipulation |
| lm-eval-harness | Standard benchmarks |
| vLLM | Fast inference for evals |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Weights & Biases | Experiment tracking |
| Modal/RunPod | GPU cloud compute |
| Docker | Reproducible environments |
| DVC | Dataset versioning |

### UI (for preference collection)
| Technology | Purpose |
|------------|---------|
| Gradio | Quick UI for labeling |
| FastAPI | Backend API |
| PostgreSQL | Store preferences |

---

## 4. System Architecture

### High-Level Training Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TRAINING PIPELINE                                  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         DATA PIPELINE                                │    │
│  │                                                                      │    │
│  │  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │    │
│  │  │   Raw    │───▶│  Clean   │───▶│  Format  │───▶│ Tokenize │      │    │
│  │  │   Data   │    │  Filter  │    │ (ChatML) │    │          │      │    │
│  │  └──────────┘    └──────────┘    └──────────┘    └──────────┘      │    │
│  │       │                                               │              │    │
│  │       ▼                                               ▼              │    │
│  │  JSON/Parquet                                   TokenizedDataset     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         TRAINING LOOP                                │    │
│  │                                                                      │    │
│  │  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │    │
│  │  │  Model   │───▶│  LoRA    │───▶│ Forward  │───▶│ Backward │      │    │
│  │  │  Load    │    │  Inject  │    │   Pass   │    │   Pass   │      │    │
│  │  └──────────┘    └──────────┘    └──────────┘    └──────────┘      │    │
│  │                                                        │             │    │
│  │                                                        ▼             │    │
│  │                                               ┌──────────────┐       │    │
│  │                                               │   Optimizer  │       │    │
│  │                                               │     Step     │       │    │
│  │                                               └──────────────┘       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         EVALUATION                                   │    │
│  │                                                                      │    │
│  │  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │    │
│  │  │Perplexity│    │  Task    │    │   LLM    │    │  Human   │      │    │
│  │  │          │    │ Accuracy │    │  Judge   │    │  Prefs   │      │    │
│  │  └──────────┘    └──────────┘    └──────────┘    └──────────┘      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│                              ┌──────────────┐                                │
│                              │    W&B       │                                │
│                              │  Dashboard   │                                │
│                              └──────────────┘                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### SFT vs DPO vs RLHF Comparison

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     TRAINING METHOD COMPARISON                               │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    SFT (Supervised Fine-Tuning)                      │    │
│  │                                                                      │    │
│  │  Dataset: [(prompt, ideal_response), ...]                           │    │
│  │                                                                      │    │
│  │  prompt ──▶ [Model] ──▶ response ──▶ CrossEntropyLoss(response,     │    │
│  │                                        ideal_response)               │    │
│  │                                                                      │    │
│  │  Pros: Simple, fast, works well                                     │    │
│  │  Cons: Needs high-quality demonstrations                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                   DPO (Direct Preference Optimization)               │    │
│  │                                                                      │    │
│  │  Dataset: [(prompt, chosen, rejected), ...]                         │    │
│  │                                                                      │    │
│  │  prompt ──▶ [Policy]     ──▶ log_prob(chosen) - log_prob(rejected)  │    │
│  │         ──▶ [Reference]  ──▶ log_prob(chosen) - log_prob(rejected)  │    │
│  │                                                                      │    │
│  │  Loss = -log(sigmoid(beta * (policy_diff - ref_diff)))              │    │
│  │                                                                      │    │
│  │  Pros: No reward model needed, stable training                      │    │
│  │  Cons: Needs paired preference data                                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    RLHF (Reinforcement Learning from Human Feedback) │    │
│  │                                                                      │    │
│  │  1. Train Reward Model on preferences                               │    │
│  │  2. Use PPO to optimize policy against reward                       │    │
│  │                                                                      │    │
│  │  prompt ──▶ [Policy] ──▶ response ──▶ [Reward Model] ──▶ score      │    │
│  │                              │                              │        │    │
│  │                              └──────── PPO Loss ◀───────────┘        │    │
│  │                                                                      │    │
│  │  Pros: Most flexible, can optimize arbitrary rewards                │    │
│  │  Cons: Complex, unstable, reward hacking risk                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Evaluation Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EVALUATION PIPELINE                                 │
│                                                                              │
│  ┌──────────────────┐                                                       │
│  │   Trained Model  │                                                       │
│  └────────┬─────────┘                                                       │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    AUTOMATIC EVALUATIONS                             │    │
│  │                                                                      │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │    │
│  │  │ Perplexity  │  │   MMLU/     │  │  HumanEval  │                 │    │
│  │  │  on test    │  │  ARC/       │  │  (coding)   │                 │    │
│  │  │   set       │  │  HellaSwag  │  │             │                 │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 │    │
│  │                                                                      │    │
│  │  Results: {"perplexity": 3.2, "mmlu": 0.65, "humaneval": 0.45}     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    MODEL-GRADED EVALUATIONS                          │    │
│  │                                                                      │    │
│  │  Test Prompt ──▶ [Your Model] ──▶ Response                          │    │
│  │                                        │                             │    │
│  │                                        ▼                             │    │
│  │  ┌──────────────────────────────────────────────────────────┐       │    │
│  │  │  Judge Prompt:                                            │       │    │
│  │  │  "Rate this response on helpfulness (1-5):               │       │    │
│  │  │   Question: {test_prompt}                                 │       │    │
│  │  │   Response: {response}"                                   │       │    │
│  │  └──────────────────────────────────────────────────────────┘       │    │
│  │                         │                                            │    │
│  │                         ▼                                            │    │
│  │             [LLM judge / reward model] ──▶ Score: 4/5              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    HUMAN EVALUATION (Sampling)                       │    │
│  │                                                                      │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │  "Which response is better?"                                 │    │    │
│  │  │                                                              │    │    │
│  │  │  Q: How do I sort a list in Python?                         │    │    │
│  │  │                                                              │    │    │
│  │  │  [A] sorted_list = sorted(my_list)                          │    │    │
│  │  │                                                              │    │    │
│  │  │  [B] for i in range(len(my_list)): ...bubble sort...        │    │    │
│  │  │                                                              │    │    │
│  │  │  [ Choose A ]  [ Choose B ]  [ Tie ]                        │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         RESULTS DASHBOARD                            │    │
│  │                                                                      │    │
│  │  Model: my-finetuned-llama-3.2-3b-v2                                │    │
│  │  ─────────────────────────────────────────                          │    │
│  │  Perplexity:     3.21 (↓ from 3.89)                                 │    │
│  │  MMLU:           65.2% (↑ from 58.1%)                               │    │
│  │  HumanEval:      45.1% (↑ from 32.0%)                               │    │
│  │  LLM-Judge:      4.2/5 avg                                          │    │
│  │  Human Win Rate: 67% vs baseline                                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Data Formats

### SFT Dataset Format (ChatML)

```json
// sft_data.jsonl
{
  "messages": [
    {"role": "system", "content": "You are a helpful coding assistant."},
    {"role": "user", "content": "Write a Python function to check if a number is prime."},
    {"role": "assistant", "content": "```python\ndef is_prime(n: int) -> bool:\n    if n < 2:\n        return False\n    for i in range(2, int(n ** 0.5) + 1):\n        if n % i == 0:\n            return False\n    return True\n```"}
  ]
}
{
  "messages": [
    {"role": "user", "content": "Explain recursion in simple terms."},
    {"role": "assistant", "content": "Recursion is when a function calls itself to solve a problem. Think of it like Russian nesting dolls - each doll contains a smaller version of itself until you reach the smallest one."}
  ]
}
```

### DPO Dataset Format

```json
// dpo_data.jsonl
{
  "prompt": "Explain quantum computing to a 5-year-old.",
  "chosen": "Imagine you have a magic coin that can be heads AND tails at the same time until you look at it. Quantum computers use special bits like that magic coin to solve puzzles really fast!",
  "rejected": "Quantum computing leverages quantum mechanical phenomena such as superposition and entanglement to perform computations on qubits, enabling exponential speedup for certain algorithmic classes."
}
{
  "prompt": "Write a haiku about programming.",
  "chosen": "Bugs in the dark night\nDebugging until dawn breaks\nCode finally works",
  "rejected": "programming is fun\ni like to write code all day\ncomputers are cool"
}
```

### Preference Collection Schema (PostgreSQL)

```sql
-- Examples for labeling
CREATE TABLE examples (
    id UUID PRIMARY KEY,
    prompt TEXT NOT NULL,
    response_a TEXT NOT NULL,
    response_b TEXT NOT NULL,
    model_a VARCHAR(100),
    model_b VARCHAR(100),
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Human preferences
CREATE TABLE preferences (
    id UUID PRIMARY KEY,
    example_id UUID REFERENCES examples(id),
    labeler_id UUID,
    choice VARCHAR(10) NOT NULL, -- 'a', 'b', 'tie'
    confidence INTEGER, -- 1-5
    reasoning TEXT,
    time_spent_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Labelers
CREATE TABLE labelers (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    agreement_rate FLOAT, -- Inter-annotator agreement
    total_labels INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_preferences_example ON preferences(example_id);
CREATE INDEX idx_examples_category ON examples(category);
```

---

## 6. Core Implementation

### Dataset Preparation

```python
# data/prepare.py
from datasets import Dataset, load_dataset
from transformers import AutoTokenizer
from typing import Callable

def load_and_prepare_sft_data(
    data_path: str,
    tokenizer: AutoTokenizer,
    max_length: int = 2048,
    chat_template: str | None = None
) -> Dataset:
    """Load and tokenize SFT dataset."""

    # Load raw data
    if data_path.endswith('.jsonl'):
        dataset = load_dataset('json', data_files=data_path, split='train')
    else:
        dataset = load_dataset(data_path, split='train')

    def format_and_tokenize(examples):
        texts = []
        for messages in examples['messages']:
            # Apply chat template
            if chat_template:
                text = tokenizer.apply_chat_template(
                    messages,
                    tokenize=False,
                    add_generation_prompt=False
                )
            else:
                # Default ChatML format
                text = ""
                for msg in messages:
                    role = msg['role']
                    content = msg['content']
                    if role == 'system':
                        text += f"<|system|>\n{content}</s>\n"
                    elif role == 'user':
                        text += f"<|user|>\n{content}</s>\n"
                    elif role == 'assistant':
                        text += f"<|assistant|>\n{content}</s>\n"
            texts.append(text)

        # Tokenize
        tokenized = tokenizer(
            texts,
            truncation=True,
            max_length=max_length,
            padding=False,
            return_tensors=None
        )

        # Create labels (same as input_ids for causal LM)
        tokenized['labels'] = tokenized['input_ids'].copy()

        return tokenized

    dataset = dataset.map(
        format_and_tokenize,
        batched=True,
        remove_columns=dataset.column_names
    )

    return dataset


def load_and_prepare_dpo_data(
    data_path: str,
    tokenizer: AutoTokenizer,
    max_length: int = 2048
) -> Dataset:
    """Load and prepare DPO dataset with chosen/rejected pairs."""

    if data_path.endswith('.jsonl'):
        dataset = load_dataset('json', data_files=data_path, split='train')
    else:
        dataset = load_dataset(data_path, split='train')

    def format_for_dpo(examples):
        """Format into prompt, chosen, rejected format expected by TRL."""
        formatted = {
            'prompt': [],
            'chosen': [],
            'rejected': []
        }

        for prompt, chosen, rejected in zip(
            examples['prompt'],
            examples['chosen'],
            examples['rejected']
        ):
            # Format as chat messages
            formatted['prompt'].append(f"<|user|>\n{prompt}</s>\n<|assistant|>\n")
            formatted['chosen'].append(f"{chosen}</s>")
            formatted['rejected'].append(f"{rejected}</s>")

        return formatted

    dataset = dataset.map(
        format_for_dpo,
        batched=True,
        remove_columns=dataset.column_names
    )

    return dataset
```

### SFT Training

```python
# training/sft.py
import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    BitsAndBytesConfig
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer, DataCollatorForCompletionOnlyLM
from data.prepare import load_and_prepare_sft_data
import wandb

def train_sft(
    model_name: str,
    data_path: str,
    output_dir: str,
    # LoRA config
    lora_r: int = 16,
    lora_alpha: int = 32,
    lora_dropout: float = 0.05,
    # Training config
    num_epochs: int = 3,
    batch_size: int = 4,
    gradient_accumulation_steps: int = 4,
    learning_rate: float = 2e-4,
    max_length: int = 2048,
    # Quantization
    use_4bit: bool = True,
    # Logging
    wandb_project: str = "sft-training"
):
    """Train a model with SFT + LoRA."""

    # Initialize wandb
    wandb.init(project=wandb_project, config={
        "model": model_name,
        "lora_r": lora_r,
        "learning_rate": learning_rate,
        "epochs": num_epochs
    })

    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    # Quantization config for memory efficiency
    bnb_config = None
    if use_4bit:
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16,
            bnb_4bit_use_double_quant=True
        )

    # Load model
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        quantization_config=bnb_config,
        device_map="auto",
        torch_dtype=torch.bfloat16,
        attn_implementation="flash_attention_2"  # Use Flash Attention
    )

    # Prepare for k-bit training
    if use_4bit:
        model = prepare_model_for_kbit_training(model)

    # LoRA config
    lora_config = LoraConfig(
        r=lora_r,
        lora_alpha=lora_alpha,
        lora_dropout=lora_dropout,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                       "gate_proj", "up_proj", "down_proj"],
        bias="none",
        task_type="CAUSAL_LM"
    )

    # Apply LoRA
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # Load dataset
    dataset = load_and_prepare_sft_data(data_path, tokenizer, max_length)

    # Training arguments
    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=num_epochs,
        per_device_train_batch_size=batch_size,
        gradient_accumulation_steps=gradient_accumulation_steps,
        learning_rate=learning_rate,
        weight_decay=0.01,
        warmup_ratio=0.03,
        lr_scheduler_type="cosine",
        logging_steps=10,
        save_strategy="steps",
        save_steps=500,
        eval_strategy="steps",
        eval_steps=500,
        bf16=True,
        gradient_checkpointing=True,
        report_to="wandb",
        optim="paged_adamw_8bit" if use_4bit else "adamw_torch",
        max_grad_norm=0.3,
    )

    # Data collator for completion-only training
    # Only compute loss on assistant responses
    response_template = "<|assistant|>\n"
    collator = DataCollatorForCompletionOnlyLM(
        response_template=response_template,
        tokenizer=tokenizer
    )

    # Create trainer
    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=dataset,
        data_collator=collator,
        tokenizer=tokenizer,
        max_seq_length=max_length,
    )

    # Train
    trainer.train()

    # Save final model
    trainer.save_model(output_dir)
    tokenizer.save_pretrained(output_dir)

    wandb.finish()

    return output_dir
```

### DPO Training

```python
# training/dpo.py
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import LoraConfig
from trl import DPOTrainer, DPOConfig
from data.prepare import load_and_prepare_dpo_data
import wandb

def train_dpo(
    model_name: str,  # SFT checkpoint or base model
    data_path: str,
    output_dir: str,
    # DPO config
    beta: float = 0.1,  # KL penalty coefficient
    # LoRA config
    lora_r: int = 16,
    lora_alpha: int = 32,
    # Training config
    num_epochs: int = 1,
    batch_size: int = 2,
    gradient_accumulation_steps: int = 8,
    learning_rate: float = 5e-5,
    max_length: int = 1024,
    # Logging
    wandb_project: str = "dpo-training"
):
    """Train with Direct Preference Optimization."""

    wandb.init(project=wandb_project, config={
        "model": model_name,
        "beta": beta,
        "learning_rate": learning_rate
    })

    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    tokenizer.pad_token = tokenizer.eos_token

    # 4-bit quantization
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16
    )

    # Load policy model (the one we're training)
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        quantization_config=bnb_config,
        device_map="auto",
        torch_dtype=torch.bfloat16
    )

    # Load reference model (frozen, for KL penalty)
    ref_model = AutoModelForCausalLM.from_pretrained(
        model_name,
        quantization_config=bnb_config,
        device_map="auto",
        torch_dtype=torch.bfloat16
    )

    # LoRA config
    peft_config = LoraConfig(
        r=lora_r,
        lora_alpha=lora_alpha,
        lora_dropout=0.05,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                       "gate_proj", "up_proj", "down_proj"],
        bias="none",
        task_type="CAUSAL_LM"
    )

    # Load dataset
    dataset = load_and_prepare_dpo_data(data_path, tokenizer, max_length)

    # DPO config
    dpo_config = DPOConfig(
        output_dir=output_dir,
        num_train_epochs=num_epochs,
        per_device_train_batch_size=batch_size,
        gradient_accumulation_steps=gradient_accumulation_steps,
        learning_rate=learning_rate,
        beta=beta,  # KL penalty
        max_length=max_length,
        max_prompt_length=max_length // 2,
        bf16=True,
        gradient_checkpointing=True,
        logging_steps=10,
        save_steps=500,
        report_to="wandb",
        remove_unused_columns=False
    )

    # Create DPO trainer
    trainer = DPOTrainer(
        model=model,
        ref_model=ref_model,
        args=dpo_config,
        train_dataset=dataset,
        tokenizer=tokenizer,
        peft_config=peft_config
    )

    # Train
    trainer.train()

    # Save
    trainer.save_model(output_dir)
    wandb.finish()

    return output_dir
```

### Evaluation Framework

```python
# evaluation/eval.py
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from vllm import LLM, SamplingParams
import anthropic
from datasets import load_dataset
import json
from typing import Callable
from tqdm import tqdm

class EvalRunner:
    """Run evaluations on a trained model."""

    def __init__(
        self,
        model_path: str,
        use_vllm: bool = True,
        max_tokens: int = 512
    ):
        self.model_path = model_path
        self.max_tokens = max_tokens

        if use_vllm:
            # Use vLLM for fast inference
            self.llm = LLM(model=model_path, dtype="bfloat16")
            self.sampling_params = SamplingParams(
                max_tokens=max_tokens,
                temperature=0.0
            )
        else:
            # Use transformers
            self.tokenizer = AutoTokenizer.from_pretrained(model_path)
            self.model = AutoModelForCausalLM.from_pretrained(
                model_path,
                device_map="auto",
                torch_dtype=torch.bfloat16
            )

    def generate(self, prompts: list[str]) -> list[str]:
        """Generate responses for prompts."""
        if hasattr(self, 'llm'):
            outputs = self.llm.generate(prompts, self.sampling_params)
            return [o.outputs[0].text for o in outputs]
        else:
            responses = []
            for prompt in tqdm(prompts):
                inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=self.max_tokens,
                    do_sample=False
                )
                response = self.tokenizer.decode(
                    outputs[0][inputs['input_ids'].shape[1]:],
                    skip_special_tokens=True
                )
                responses.append(response)
            return responses

    def eval_perplexity(self, eval_data_path: str) -> float:
        """Calculate perplexity on eval set."""
        # Use transformers for perplexity
        if not hasattr(self, 'model'):
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_path)
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_path,
                device_map="auto",
                torch_dtype=torch.bfloat16
            )

        dataset = load_dataset('json', data_files=eval_data_path, split='train')

        total_loss = 0
        total_tokens = 0

        for example in tqdm(dataset):
            text = example['text'] if 'text' in example else str(example)
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=2048
            ).to(self.model.device)

            with torch.no_grad():
                outputs = self.model(**inputs, labels=inputs['input_ids'])
                total_loss += outputs.loss.item() * inputs['input_ids'].shape[1]
                total_tokens += inputs['input_ids'].shape[1]

        perplexity = torch.exp(torch.tensor(total_loss / total_tokens)).item()
        return perplexity

    def eval_task_accuracy(
        self,
        eval_data_path: str,
        answer_extractor: Callable[[str], str] | None = None
    ) -> dict:
        """Evaluate on QA-style tasks."""
        dataset = load_dataset('json', data_files=eval_data_path, split='train')

        prompts = [ex['prompt'] for ex in dataset]
        expected = [ex['answer'] for ex in dataset]

        responses = self.generate(prompts)

        correct = 0
        results = []

        for prompt, response, answer in zip(prompts, responses, expected):
            # Extract answer from response if needed
            if answer_extractor:
                extracted = answer_extractor(response)
            else:
                extracted = response.strip()

            is_correct = extracted.lower() == answer.lower()
            correct += int(is_correct)

            results.append({
                "prompt": prompt,
                "response": response,
                "expected": answer,
                "extracted": extracted,
                "correct": is_correct
            })

        return {
            "accuracy": correct / len(expected),
            "correct": correct,
            "total": len(expected),
            "results": results
        }


class LLMJudge:
    """Use a strong evaluation model to judge responses."""

    def __init__(self, judge_model: str = "your-judge-model-id"):
        self.client = anthropic.Anthropic()
        self.judge_model = judge_model

    def evaluate(
        self,
        prompt: str,
        response: str,
        criteria: str = "helpfulness, accuracy, and clarity"
    ) -> dict:
        """Get LLM judgment on a response."""

        judge_prompt = f"""You are evaluating an AI assistant's response.

**User Question:**
{prompt}

**Assistant Response:**
{response}

**Evaluation Criteria:** {criteria}

Rate the response on a scale of 1-5:
1 = Poor (incorrect, unhelpful, or harmful)
2 = Below Average (partially correct but missing key information)
3 = Average (correct but could be improved)
4 = Good (helpful and accurate)
5 = Excellent (comprehensive, clear, and highly useful)

Respond in JSON format:
{{"score": <1-5>, "reasoning": "<brief explanation>"}}"""

        message = self.client.messages.create(
            model=self.judge_model,
            max_tokens=256,
            messages=[{"role": "user", "content": judge_prompt}]
        )

        try:
            result = json.loads(message.content[0].text)
            return result
        except:
            return {"score": 0, "reasoning": "Failed to parse judge response"}

    def compare(
        self,
        prompt: str,
        response_a: str,
        response_b: str
    ) -> dict:
        """Compare two responses head-to-head."""

        compare_prompt = f"""You are comparing two AI assistant responses.

**User Question:**
{prompt}

**Response A:**
{response_a}

**Response B:**
{response_b}

Which response is better? Consider helpfulness, accuracy, and clarity.

Respond in JSON format:
{{"winner": "A" or "B" or "tie", "reasoning": "<brief explanation>"}}"""

        message = self.client.messages.create(
            model=self.judge_model,
            max_tokens=256,
            messages=[{"role": "user", "content": compare_prompt}]
        )

        try:
            result = json.loads(message.content[0].text)
            return result
        except:
            return {"winner": "tie", "reasoning": "Failed to parse comparison"}
```

### Training Script Entry Point

```python
# train.py
import argparse
from training.sft import train_sft
from training.dpo import train_dpo
from evaluation.eval import EvalRunner, LLMJudge

def main():
    parser = argparse.ArgumentParser(description="Train LLMs with SFT/DPO")
    subparsers = parser.add_subparsers(dest="command")

    # SFT command
    sft_parser = subparsers.add_parser("sft", help="Supervised Fine-Tuning")
    sft_parser.add_argument("--model", required=True, help="Base model name/path")
    sft_parser.add_argument("--data", required=True, help="Training data path")
    sft_parser.add_argument("--output", required=True, help="Output directory")
    sft_parser.add_argument("--epochs", type=int, default=3)
    sft_parser.add_argument("--lr", type=float, default=2e-4)
    sft_parser.add_argument("--lora-r", type=int, default=16)

    # DPO command
    dpo_parser = subparsers.add_parser("dpo", help="Direct Preference Optimization")
    dpo_parser.add_argument("--model", required=True, help="SFT checkpoint path")
    dpo_parser.add_argument("--data", required=True, help="Preference data path")
    dpo_parser.add_argument("--output", required=True, help="Output directory")
    dpo_parser.add_argument("--beta", type=float, default=0.1)
    dpo_parser.add_argument("--epochs", type=int, default=1)

    # Eval command
    eval_parser = subparsers.add_parser("eval", help="Evaluate model")
    eval_parser.add_argument("--model", required=True, help="Model path")
    eval_parser.add_argument("--data", required=True, help="Eval data path")
    eval_parser.add_argument("--type", choices=["perplexity", "accuracy", "judge"], required=True)

    args = parser.parse_args()

    if args.command == "sft":
        train_sft(
            model_name=args.model,
            data_path=args.data,
            output_dir=args.output,
            num_epochs=args.epochs,
            learning_rate=args.lr,
            lora_r=args.lora_r
        )
    elif args.command == "dpo":
        train_dpo(
            model_name=args.model,
            data_path=args.data,
            output_dir=args.output,
            beta=args.beta,
            num_epochs=args.epochs
        )
    elif args.command == "eval":
        runner = EvalRunner(args.model)
        if args.type == "perplexity":
            ppl = runner.eval_perplexity(args.data)
            print(f"Perplexity: {ppl:.2f}")
        elif args.type == "accuracy":
            results = runner.eval_task_accuracy(args.data)
            print(f"Accuracy: {results['accuracy']:.2%}")
        elif args.type == "judge":
            # LLM-as-judge evaluation
            judge = LLMJudge()
            # ... run judge evaluations

if __name__ == "__main__":
    main()
```

---

## 7. Implementation Phases

### Phase 1: Data Pipeline
1. Create dataset loading utilities
2. Implement ChatML formatting
3. Build tokenization pipeline
4. Add data validation and cleaning
5. Create train/eval split logic

### Phase 2: SFT Training
1. Set up base training script
2. Implement LoRA/QLoRA support
3. Add gradient checkpointing
4. Integrate Weights & Biases logging
5. Implement checkpointing and resumption
6. Test on small model (TinyLlama)

### Phase 3: Evaluation Framework
1. Implement perplexity calculation
2. Build task accuracy evaluation
3. Create LLM-as-judge evaluator
4. Add comparison evaluation
5. Build results dashboard

### Phase 4: DPO Training
1. Prepare preference data format
2. Implement DPO loss
3. Set up reference model loading
4. Add DPO-specific logging
5. Test full SFT → DPO pipeline

### Phase 5: Preference Collection (V2)
1. Build Gradio labeling UI
2. Create backend API for labels
3. Implement inter-annotator agreement
4. Add quality control metrics

### Phase 6: Production
1. Multi-GPU training support
2. Model export (GGUF, ONNX)
3. Inference optimization
4. Documentation and examples

---

## 8. AI/ML Concepts Covered

| # | Concept | How It's Used |
|---|---------|---------------|
| 1 | Transformers | Model architecture understanding |
| 2 | Tokenization | BPE, chat templates |
| 3 | Supervised Learning | SFT loss, cross-entropy |
| 4 | LoRA/QLoRA | Parameter-efficient training |
| 5 | Preference Learning | DPO, reward modeling |
| 6 | KL Divergence | Reference model penalty |
| 7 | Gradient Checkpointing | Memory optimization |
| 8 | Mixed Precision | BF16/FP16 training |
| 9 | Evaluation Design | Metrics, benchmarks, judges |
| 10 | Distributed Training | Multi-GPU, DeepSpeed |
| 11 | Model Quantization | 4-bit, 8-bit inference |

---

## 9. Folder Structure

```
rl-finetuning/
├── src/
│   ├── data/
│   │   ├── __init__.py
│   │   ├── prepare.py           # Dataset preparation
│   │   ├── formats.py           # Data format utilities
│   │   └── validation.py        # Data validation
│   ├── training/
│   │   ├── __init__.py
│   │   ├── sft.py               # SFT trainer
│   │   ├── dpo.py               # DPO trainer
│   │   ├── reward_model.py      # Reward model (v2)
│   │   └── ppo.py               # PPO trainer (v2)
│   ├── evaluation/
│   │   ├── __init__.py
│   │   ├── eval.py              # Eval runner
│   │   ├── judge.py             # LLM judge
│   │   └── benchmarks.py        # Standard benchmarks
│   ├── ui/
│   │   ├── __init__.py
│   │   └── labeling.py          # Gradio labeling UI
│   └── config.py
├── configs/
│   ├── sft_llama_7b.yaml
│   ├── dpo_llama_7b.yaml
│   └── eval_config.yaml
├── data/
│   ├── raw/
│   ├── processed/
│   └── preferences/
├── checkpoints/
├── results/
├── train.py                      # Entry point
├── pyproject.toml
├── Dockerfile
└── README.md
```

---

## 10. Development Commands

```bash
# Create project
mkdir rl-finetuning && cd rl-finetuning
uv init

# Install dependencies
uv add torch transformers datasets accelerate
uv add peft trl bitsandbytes
uv add vllm anthropic wandb
uv add gradio fastapi uvicorn
uv add --dev pytest ruff

# Login to services
wandb login
huggingface-cli login

# Prepare data
python -m src.data.prepare --input raw/data.jsonl --output processed/

# Run SFT training
python train.py sft \
  --model meta-llama/Llama-3.2-3B \
  --data data/processed/sft_train.jsonl \
  --output checkpoints/sft-v1 \
  --epochs 3 \
  --lr 2e-4

# Run DPO training
python train.py dpo \
  --model checkpoints/sft-v1 \
  --data data/preferences/dpo_train.jsonl \
  --output checkpoints/dpo-v1 \
  --beta 0.1

# Evaluate
python train.py eval \
  --model checkpoints/dpo-v1 \
  --data data/processed/eval.jsonl \
  --type accuracy

# Run labeling UI
python -m src.ui.labeling
```

---

## 11. Example Workflow

```bash
# 1. Prepare your SFT data
cat > data/sft_sample.jsonl << 'EOF'
{"messages": [{"role": "user", "content": "What is 2+2?"}, {"role": "assistant", "content": "2+2 equals 4."}]}
{"messages": [{"role": "user", "content": "Write hello world in Python"}, {"role": "assistant", "content": "```python\nprint('Hello, World!')\n```"}]}
EOF

# 2. Run SFT (on small model for testing)
python train.py sft \
  --model TinyLlama/TinyLlama-1.1B-Chat-v1.0 \
  --data data/sft_sample.jsonl \
  --output checkpoints/test-sft \
  --epochs 1

# 3. Prepare preference data
cat > data/dpo_sample.jsonl << 'EOF'
{"prompt": "Explain recursion", "chosen": "Recursion is when a function calls itself...", "rejected": "Recursion is complicated..."}
EOF

# 4. Run DPO
python train.py dpo \
  --model checkpoints/test-sft \
  --data data/dpo_sample.jsonl \
  --output checkpoints/test-dpo

# 5. Evaluate
python train.py eval \
  --model checkpoints/test-dpo \
  --data data/eval.jsonl \
  --type judge
```

---

## Summary

This project teaches you the full lifecycle of fine-tuning language models, from data preparation through training to evaluation. You'll implement SFT for teaching models new behaviors, DPO for aligning them with human preferences, and build comprehensive evaluation pipelines to measure improvement. This is essential knowledge for anyone customizing LLMs for production use cases.

**Estimated Complexity**: Advanced
**Core Skills**: PyTorch, Transformers, Training Loops, Evaluation Design
**Key Challenge**: Managing memory and compute for large model training
