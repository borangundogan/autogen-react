#!/usr/bin/env python
import os
import sys
import subprocess
import time
import argparse

def run_tests(skip_slow=True, verbose=True):
    """Run the test suite with proper environment setup."""
    print("🧪 Running Travel Planning Agent backend tests...")
    
    # Set environment variables for testing
    test_env = os.environ.copy()
    
    if skip_slow:
        test_env["SKIP_SLOW_TESTS"] = "true"
        print("⏩ Skipping slow tests that require API calls")
    else:
        print("🚀 Running all tests including API calls (this may take some time)")
    
    # Build the pytest command
    cmd = ["pytest"]
    
    if verbose:
        cmd.append("-v")
    
    # Add the test directory
    cmd.append("tests/")
    
    # Run the tests
    start_time = time.time()
    result = subprocess.run(cmd, env=test_env, capture_output=False)
    elapsed_time = time.time() - start_time
    
    # Report the results
    if result.returncode == 0:
        print(f"✅ All tests passed in {elapsed_time:.2f} seconds!")
        return 0
    else:
        print(f"❌ Some tests failed (completed in {elapsed_time:.2f} seconds)")
        return result.returncode

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the Travel Planning Agent backend tests")
    parser.add_argument("--all", action="store_true", help="Run all tests including slow API calls")
    parser.add_argument("--quiet", action="store_true", help="Run tests with less output")
    
    args = parser.parse_args()
    
    sys.exit(run_tests(skip_slow=not args.all, verbose=not args.quiet)) 