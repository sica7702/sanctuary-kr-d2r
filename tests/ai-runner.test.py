import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('runner',Path(__file__).parents[1]/'learning/runner.py')
runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(runner)

class RunnerTests(unittest.TestCase):
    def test_rejects_insecure_or_credential_url(self):
        for url in ['http://example.com','https://user:pass@example.com','https://example.com?token=x']:
            with self.assertRaises(ValueError):runner.Client(url,'a'*64)

    def test_no_data_does_not_start_training(self):
        class Client:
            def post(self,path,body=None):return {'complete':True} if path=='sync' else {'status':'waiting_data'}
        with tempfile.TemporaryDirectory() as directory, patch.object(runner.subprocess,'run') as child:
            self.assertFalse(runner.cycle(Client(),Path(directory)))
            child.assert_not_called()

    def test_server_test_fold_is_never_used_to_train(self):
        class Client:
            def __init__(self):self.failed=False
            def post(self,path,body=None):
                if path=='sync':return {'complete':True}
                if path=='jobs':return {'status':'ready','job_id':'fixture','lease':'test','schema':'schema','features':[]}
                if path=='data':return {'rows':[{'fold':'test','position':0}],'next':None}
                if path=='failed':self.failed=True;return {'ok':True}
                raise AssertionError(path)
        client=Client()
        with tempfile.TemporaryDirectory() as directory, patch.object(runner.subprocess,'run') as child:
            with self.assertRaisesRegex(ValueError,'invalid_training_fold'):runner.cycle(client,Path(directory))
            child.assert_not_called();self.assertTrue(client.failed)

if __name__=='__main__':unittest.main()
